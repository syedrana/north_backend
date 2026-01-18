const securapi = (req, res, next) => {
    if (req.headers.authorization === process.env.SECURE_API_KEY) {
        return next(); // return ব্যবহার করা নিরাপদ
    } else {
        return res.status(401).json({ success: false, message: "Authorization failed" });
    }
};

module.exports = securapi;