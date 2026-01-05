const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Payment must be linked to an order"],
      index: true, // সার্চিং ফাস্ট করার জন্য
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Payment must belong to a user"],
    },
    method: {
      type: String,
      enum: {
        values: ["COD", "STRIPE", "SSLCOMMERZ", "BKASH", "NAGAD"],
        message: "{VALUE} is not a supported payment method",
      },
      required: [true, "Payment method is required"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [1, "Amount must be at least 1"],
    },
    currency: {
      type: String,
      default: "BDT", // বাংলাদেশের প্রেক্ষাপটে ডিফল্ট BDT
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    transactionId: {
      type: String,
      unique: true, // ট্রানজেকশন আইডি অবশ্যই ইউনিক হতে হবে
      sparse: true, // যাতে pending পেমেন্টের ক্ষেত্রে নাল (null) ভ্যালু সমস্যা না করে
      trim: true,
    },
    paymentGatewayResponse: {
      type: Object, // গেটওয়ে থেকে আসা পুরো রেসপন্সটি সেভ করে রাখা (ভবিষ্যতে প্রমাণের জন্য)
    },
    paidAt: {
      type: Date,
    },
    refundInfo: {
      refundId: String,
      refundReason: String,
      refundedAt: Date,
    },
  },
  { 
    timestamps: true 
  }
);

// সিকিউরিটি ইনডেক্স
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Payment", paymentSchema);