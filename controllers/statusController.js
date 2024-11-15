import jsonwebtoken from "jsonwebtoken";

export async function loggedInStatus(req,res,next){ //for frontend
    console.log('auth/check');
    const token =req.cookies.token;
    if(!token){
        return res.json({isLoggedIn:false});
    }
    console.log(token);
    try{
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET_KEY);
        if(decoded){
            console.log('decoded  : ' ,decoded)
            return res.json({isLoggedIn: true});
        }
    }catch(error){
        console.log(error);
        return res.json({isLoggedIn: false});
    }
}



