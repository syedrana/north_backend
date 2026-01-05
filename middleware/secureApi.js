let securapi = (req, res, next ) => {
// console.log(req.headers.authorization);
    if(req.headers.authorization == 1234567890){
        next();
    }else{
        res.send("Authorization failed");
    }
};

module.exports = securapi;