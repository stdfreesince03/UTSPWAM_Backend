import jsonwebtoken from "jsonwebtoken";

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



