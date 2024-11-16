import * as dotenv from "dotenv";
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.dev';
dotenv.config({ path: envFile }); // Load dotenv at the top

import db from './config/db.js';
import cors from 'cors';
import express from 'express';
import authRouter from "./routes/auth.js";
import cookieParser from "cookie-parser";
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import jsonwebtoken from "jsonwebtoken";
import {authenticateJWT} from "./middleware/is-auth.js";

const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com");
    next();
});

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use('/fonts', express.static(path.join(__dirname, 'fonts')));

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
            passReqToCallback: true,
            prompt: 'select_account'
        },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const state = JSON.parse(req.query.state);
                const role = state.role;

                let hawktuah = null;
                const googleId = profile.id;
                const firstName = profile.name?.givenName || 'John';
                const lastName = profile.name?.familyName || 'Doe';
                const email = profile.emails[0].value;


                let { data: user, error } = await db
                    .from(role)
                    .select('*')
                    .eq('google_id', googleId)
                    .single();

                hawktuah = user;

                if (!hawktuah) {
                    const { data: newUser, error: insertError } = await db
                        .from(role)
                        .upsert({
                            first_name: firstName,
                            last_name: lastName,
                            email: email,
                            google_id: googleId,
                        })
                        .select();

                    if (insertError) {
                        console.log("Database Insert Error:", insertError);
                        return done(insertError, false);
                    }

                    hawktuah = newUser;
                }

                const token = jsonwebtoken.sign(
                    {
                        id: role === 'instructor' ? hawktuah.instructor_id : hawktuah.student_id,
                        role,
                        email: hawktuah.email,
                    },
                    process.env.JWT_SECRET_KEY
                );
                console.log("Token created successfully:", token);
                return done(null, token);
            } catch (error) {
                console.log("Error in Google Strategy:", error);
                return done(error, false);
            }
        }
    )
);

app.use(authRouter);

app.get('/progress/:labID',authenticateJWT,async(req,res,next) => {
    const { id: user_id } = req.user;  // Extracts user_id from JWT
    const { lab_id } = req.params;     // Extracts lab_id from the URL

    try {
        const { data, error } = await db
            .from('lab_progress')
            .select('score')
            .eq('user_id', user_id)
            .eq('lab_id', lab_id)
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({ score: data ? data.score : 0 });
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ message: 'Error fetching progress' });
    }
});

app.post('/progress', authenticateJWT, async (req, res) => {
    const { id: user_id, role } = req.user;
    let { lab_id, score } = req.body;

    // console.log('id : ', user_id);
    // console.log('role : ', role);
    // console.log('lab_id : ', lab_id);
    // console.log('score : ', score);

    score = parseInt(score, 10);
    lab_id = parseInt(lab_id,10);

    let wtf = null;

    try {
        const { data, error:insertError } = await db
            .from('lab_progress')
            .upsert(
                { user_id, role, lab_id, score },
                { onConflict: ['user_id', 'lab_id'] }
            )
            .select();
        wtf = insertError;
        if (insertError) {
            console.log(insertError);
            throw insertError;
        }

        res.status(201).json({ message: 'Progress saved successfully' });
    } catch (error) {
        console.error('Error saving progress:', error,wtf);
        res.status(500).json({ message: 'Error saving progress BITCH',user_id,role,lab_id,score,wtf});
    }
});
// app.get('/api/test-supabase-connection', async (req, res) => {
//     try {
//         const result = await db.from('student').select('*').limit(1);
//         if (result.error) throw result.error;
//         if (result.data.length === 0) {
//             return res.status(404).json({ error: 'No data found in the "student" table' });
//         }
//         res.json({ message: 'Database connection successful!', data: result.data[0] });
//     } catch (err) {
//         console.log('Database connection error:', err);
//         res.status(500).json({ error: 'Database connection error' });
//     }
// });


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

