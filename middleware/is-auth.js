import jsonwebtoken from "jsonwebtoken";
import cookieParser from "cookie-parser";

export async function isAuth(req, res, next) {
     const token = req.cookies.token;
     if (!token) {
         return res.status(401).json({error:'Token not found'});
     }
     try{
         const decoded = jsonwebtoken
             .verify(token, process.env.JWT_SECRET_KEY);
         if(decoded){
             req.user = decoded;
         }
         next();
     }catch(error){
         return res.status(401).json({ error: 'Not Authorized' });
     }
}