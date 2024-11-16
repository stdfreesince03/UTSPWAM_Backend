import jsonwebtoken from "jsonwebtoken";
import cookieParser from "cookie-parser";

export async function authenticateJWT(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'Token not found' });
    }
    try {
        console.log('jtw authenticated');
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET_KEY);
        req.user = { id: decoded.id, role: decoded.role };
        console.log('jtw authenticated ,user = ',req.user);
        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({ error: 'Not Authorized' });
    }
}