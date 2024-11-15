import db from '../config/db.js'
import bcrypt from 'bcrypt'
import jsonwebtoken  from 'jsonwebtoken'

export async function login(req,res){
    try{
        const email = req.body.email;
        const password = req.body.password;
        const role = req.body.role;
        const {data:user,error} = await db
            .from(role)
            .select('*')
            .eq('email',email)
            .single();

        if(error){
            return res.status(400).json({error:'Login Error'});
        }
        if(!user){
            return res.status(401).json({error:'Email or Password is incorrect'});
        }

        const isPasswordCorrect = await bcrypt.compare(password,user.password_hash);
        if(!isPasswordCorrect){
            return res.status(401).json({error:'Email or Password is incorrect'});
        }

        const token = jsonwebtoken.sign({ id:(role==='instructor' ? user.instructor_id : user.student_id),email:user.email}
            ,process.env.JWT_SECRET_KEY
            ,{expiresIn:"30d"});

        res.cookie("token",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            maxAge:30 * 24 * 60 * 60 * 1000
        })

        return res.json({message:'Login Successful',user:{email:user.email}});
    }catch(error){
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}

