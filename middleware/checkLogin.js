const jwt = require("jsonwebtoken");

let checkLogin = (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
      return res.status(401).json({ message: "Authorization header missing!" });
    }

    try {
        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { username, userid, role } = decoded;
        req.username = username;
        req.userid = userid;
        req.role = role;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token!" });
    }
};

module.exports = checkLogin;