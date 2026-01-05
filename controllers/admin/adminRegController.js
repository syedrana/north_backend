const Admin = require("../../models/admin");

let adminRegistration = async (req, res) => {
    try {
        
        const { name, username, email, password, role } = req.body;

        if (!name?.trim() || !username?.trim() || !email?.trim() || !password) {
            return res.status(400).json({ message: "All fields (name, username, email, password) are required." });
        }

        const existingAdmin = await Admin.findOne({ $or: [{ email: email }, { username: username }] });

        if (existingAdmin) {
            if (existingAdmin.email === email) {
                return res.status(409).json({ message: "Email already in use." }); // 409 Conflict
            }
            if (existingAdmin.username === username) {
                return res.status(409).json({ message: "Username already taken." });
            }
        }

        const newAdmin = new Admin({
            name: name?.trim(),
            username: username?.trim().toLowerCase(),
            email: email?.trim().toLowerCase(),
            password: password, 
            role: role || 'admin' 
        });

        const savedAdmin = await newAdmin.save();

        savedAdmin.password = undefined; 

        
        res.status(201).json({
            success: true,
            message: "Admin registered successfully.",
            user: savedAdmin,
        });

    } catch (error) {
        
        if (error.name === 'ValidationError') {
            
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }

        console.error("Error in adminRegistration:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error during registration."
        });
    }
};

module.exports = { adminRegistration };