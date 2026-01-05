const jwt = require("jsonwebtoken");

const adminCheck = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { username, userid, role } = decoded;

            if (!decoded || role !== "admin") {
              return res.status(403).json({ message: "Access denied. Admins only." });
            }

            req.username = username;
            req.userid = userid;
            req.role = role;
            next();
        } catch (err) {
            return res.status(403).json({ message: "Invalid or expired token!" });
        }

  } catch (error) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }
};

module.exports = adminCheck;
