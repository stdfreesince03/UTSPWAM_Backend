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


                const googleId = profile.id;
                const firstName = profile.name?.givenName || 'John';
                const lastName = profile.name?.familyName || 'Doe';
                const email = profile.emails[0].value;


                let { data: user, error } = await db
                    .from(role)
                    .select('*')
                    .eq('google_id', googleId)
                    .single();

                if (!user) {
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

                    user = newUser;
                }

                const token = jsonwebtoken.sign(
                    {
                        id: role === 'instructor' ? user.instructor_id : user.student_id,
                        email: user.email,
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

app.post('/progress', authenticateJWT, async (req, res) => {
    const { id: user_id, role } = req.user;  // Extracted from JWT by middleware
    const { lab_id, score } = req.body;      // Passed from the frontend

    console.log('id : ', user_id);
    console.log('role : ', role);
    console.log('lab_id : ', lab_id);
    console.log('score : ', score);
    try {
        const { data, error } = await db
            .from('lab_progress')
            .upsert({ user_id, role, lab_id, score }
                .select();

        if (error) {
            console.log('insert error');
            throw error;
        }

        res.status(201).json({ message: 'Progress saved successfully' });
    } catch (error) {
        console.error('Error saving progress:', error);
        res.status(500).json({ message: 'Error saving progress' });
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

