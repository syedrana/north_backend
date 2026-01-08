const securapi = (req, res, next) => {
    if (req.headers.authorization === "1234567890") {
        return next(); // return ব্যবহার করা নিরাপদ
    } else {
        return res.status(401).json({ success: false, message: "Authorization failed" });
    }
};

module.exports = securapi;