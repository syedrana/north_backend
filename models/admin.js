const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { Schema } = mongoose;

const adminSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter name"],
    trim: true, 
    maxlength: [50, "Name cannot exceed 50 characters"]
  },
  username: {
    type: String,
    required: [true, "Please enter username"],
    unique: true, 
    trim: true,
    lowercase: true, 
    minlength: [3, "Username must be at least 3 characters"]
  },
  email: {
    type: String,
    required: [true, "Please enter email"],
    unique: true,
    trim: true,
    lowercase: true, 
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, "Please enter password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false 
  },
  role: {
    type: String,
   
    enum: ["admin", "superadmin", "editor"],
    default: "admin"
  }
}, { timestamps: true });

adminSchema.pre("save", async function() {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
