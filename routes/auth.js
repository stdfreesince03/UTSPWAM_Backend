import express from "express";
import {login} from "../controllers/loginControllers.js";
import {signUp} from "../controllers/signupController.js";
import {loggedInStatus} from "../controllers/statusController.js";
import {logout} from "../controllers/logoutController.js";
import passport from "passport";

const authRouter = express.Router();

authRouter.post('/login', login);

authRouter.post('/signup',signUp);

authRouter.get('/auth/check',loggedInStatus);

authRouter.post('/logout',logout);


authRouter.get('/auth/google', (req, res, next) => {
    const role = req.query.role;
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: JSON.stringify({ role }),
    })(req, res, next);
});

authRouter.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', async (err, token) => {
        if (err) return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
        if (!token) return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_token`);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            sameSite: 'Strict'
        });

        res.redirect(`${process.env.FRONTEND_URL}`);
    })(req, res, next);
});


export default authRouter;