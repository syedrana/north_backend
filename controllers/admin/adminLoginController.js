const Admin = require("../../models/admin");
const jwt = require("jsonwebtoken");

let login = async (req, res) => {
   
    try {
        const { username, password } = req.body;

        if (!username) {
            return res.status(400).send("Admin name is required");
        }

        if (!password) {
            return res.status(400).send("password is required");
        }

        const admin = await Admin.findOne({ username }).select("+password"); // ⭐ VERY IMPORTANT

        if (!admin) {
        return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await admin.matchPassword(password);

        if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
        }
        
        const token = jwt.sign({
            username: admin.username,
            name: admin.name,
            email: admin.email,
            userid: admin._id,
            role: admin.role,
        }, process.env.JWT_SECRET,{
            expiresIn: "23h"
        });

        res.status(200).json({
            success: true,
            "access_token": token,
            "message": "Login Successful",
            "role": admin.role,
        });
    } 
    catch (error) {
        return res.status(500).send("Internal server error");
    }  
}

module.exports = login;
