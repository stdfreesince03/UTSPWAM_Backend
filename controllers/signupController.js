import db from '../config/db.js'
import bcrypt from 'bcrypt'
import jsonwebtoken from "jsonwebtoken";

export async function signUp(req,res){

    try {
        const { first_name,last_name,email, password, role } = req.body;
        console.log(first_name+" "+last_name+" "+email+" "+password+" "+role);

        let { data: user, error: fetchErr } = await db
            .from(role)
            .select('*')
            .eq('email', email);

        if (fetchErr) throw fetchErr;
        if (user.length>0) {
            for (const user1 of user) {
                const passwordMatch = await bcrypt.compare(password,user1.password_hash);
                if(passwordMatch){
                    return res.json({ message: 'Logging In', user: { email, role } });
                }
            }
            return res.status(409).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const { data: newUser, error: insertError } = await db
            .from(role)
            .upsert({ first_name,last_name,email, password_hash: hashedPassword })
            .select();

        if (insertError) {
            console.log(insertError);
            return res.status(400).json({ error: 'Signup Error' });
        }

        const token = jsonwebtoken.sign(
            { id: role === 'instructor' ? newUser.instructor_id : newUser.student_id, email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "30d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
        });

        return res.json({ message: 'Signup Successful', user: { email, role } });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }

}