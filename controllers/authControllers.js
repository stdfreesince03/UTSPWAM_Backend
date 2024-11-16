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

        const token = jsonwebtoken.sign({ id:(role==='instructor' ? user.instructor_id : user.student_id),email:user.email,role}
            ,process.env.JWT_SECRET_KEY
            ,{expiresIn:"30d"});

        res.cookie("token",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:'none',
            maxAge:30 * 24 * 60 * 60 * 1000
        })

        return res.json({message:'Login Successful',user:{email:user.email}});
    }catch(error){
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }

}


export async function logout (req,res,next){
    console.log('clearing cookies');
    res.clearCookie('token',{
        httpOnly:true,
        secure:process.env.NODE_ENV === 'production',
        sameSite:'none',
        path:'/'
    });
    return res.json({message:'Logout Successful'});
}

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
            // console.log(insertError);
            return res.status(400).json({ error: 'Signup Error' });
        }

        const token = jsonwebtoken.sign(
            { id: role === 'instructor' ? newUser.instructor_id : newUser.student_id, email ,role},
            process.env.JWT_SECRET_KEY,
            { expiresIn: "30d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite:'none',
            maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
        });

        return res.json({ message: 'Signup Successful', user: { email, role }, });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Internal server error' });
    }

}

export async function loggedInStatus(req,res,next) { //for frontend
    // console.log('auth/check');
    const token = req.cookies.token;

    if (!token) {
        console.log('wtf');
        return res.json({isLoggedIn: false,role:null,id:null});
    }
    console.log(token);
    try {
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET_KEY);
        if (decoded) {
            const {role, id} = decoded;
            // console.log('decoded  : ' ,decoded)
            return res.json({isLoggedIn: true, role, id});
        }
    } catch (error) {
        console.log(error);
        return res.json({isLoggedIn: false,role:null,id:null});
    }
}
