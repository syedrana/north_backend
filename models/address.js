const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Address must be linked to a user"],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Recipient full name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
    },
    phone: {
      type: String,
      required: [true, "Contact phone number is required"],
      validate: {
        validator: function (v) {
          return /^01[3-9]\d{8}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid Bangladeshi phone number!`,
      },
    },
    division: {
      type: String,
      required: [true, "Division is required"],
      trim: true,
    },
    district: {
      type: String,
      required: [true, "District is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area/Upazila is required"],
      trim: true,
    },
    addressLine: {
      type: String,
      required: [true, "Detailed address line is required"],
      trim: true,
      minlength: 10,
    },
    addressType: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Address", addressSchema);