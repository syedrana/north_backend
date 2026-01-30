const mongoose = require("mongoose");
const validator = require("validator"); // ইমেইল ভ্যালিডেশনের জন্য সহজ উপায়
const bcrypt = require("bcryptjs"); // পাসওয়ার্ড হ্যাশ করার জন্য

const userSchema = new mongoose.Schema(
  {
    firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
        minlength: [2, "First name must be at least 2 characters"],
        maxlength: [30, "First name cannot exceed 30 characters"],
    },
    lastName: {
        type: String,
        trim: true,
        maxlength: [30, "Last name cannot exceed 30 characters"],
    },
    email: {
        type: String,
        required: [true, "Email address is required"],
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, "Please provide a valid email address"],
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
        unique: true,
        trim: true,
        validate: {
            validator: function (v) {
            // বাংলাদেশি ফোন নম্বর ভ্যালিডেশন (০১৮, ০১৭, ০১৫ ইত্যাদি)
            return /^01[3-9]\d{8}$/.test(v);
            },
            message: (props) => `${props.value} is not a valid Bangladeshi phone number!`,
        },
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters long"], // দৈর্ঘ্য বাড়িয়ে ৮ করা হলো
        // validate: {
        //     validator: function (value) {
        //     // কমপক্ষে ১টি বড় হাতের অক্ষর, ১টি ছোট হাতের অক্ষর, ১টি সংখ্যা এবং ১টি স্পেশাল ক্যারেক্টার চেক করবে
        //     return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
        //     },
        //     message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        // },
        select: false,
    },
    role: {
        type: String,
        enum: {
            values: ["admin", "customer"],
            message: "{VALUE} is not a valid role",
        },
        default: "customer",
    },
    isVerified: {
        type: Boolean,
        default: true,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
  },
  { 
    timestamps: true // এটি createdAt এবং updatedAt ফিল্ড অটোমেটিক তৈরি করবে
  }
);

// --- এডভান্সড ভ্যালিডেশন (Middleware) ---

// ১. পাসওয়ার্ড সেভ করার আগে হ্যাশ করা
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ২. পাসওয়ার্ড চেক করার জন্য একটি মেথড তৈরি
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Customer", userSchema);