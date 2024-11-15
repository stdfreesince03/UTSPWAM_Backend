

export async function logout (req,res,next){
    console.log('clearing cookies');
    res.clearCookie('token',{
        httpOnly:true,
        secure:process.env.NODE_ENV === 'production',
        sameSite:'Strict',
        path:'/'
    });
    return res.json({message:'Logout Successful'});
 }

