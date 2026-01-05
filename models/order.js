const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: [true, "Product ID is required"],
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductVariant",
          required: [true, "Variant ID is required"],
        },
        name: { type: String, required: true }, // স্ন্যাপশট: প্রোডাক্টের নাম পরিবর্তন হলেও অর্ডারে আগের নাম থাকবে
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity cannot be less than 1"],
        },
        price: {
          type: Number,
          required: [true, "Price is required"],
          min: [0, "Price cannot be negative"],
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    shippingAddress: {
      fullName: { type: String, required: [true, "Full name is required"], trim: true },
      phone: { 
        type: String, 
        required: [true, "Phone number is required"],
        validate: {
          validator: (v) => /^01[3-9]\d{8}$/.test(v),
          message: "Invalid Bangladeshi phone number"
        }
      },
      division: { type: String, required: [true, "Division is required"] },
      district: { type: String, required: [true, "District is required"] },
      area: { type: String, required: [true, "Area is required"] },
      addressLine: { type: String, required: [true, "Detailed address is required"] },
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ["COD", "STRIPE", "SSLCOMMERZ"],
        message: "{VALUE} is not a valid payment method",
      },
      required: [true, "Payment method is required"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    paymentInfo: {
      id: { type: String }, // Transaction ID (Stripe/SSLCommerz থেকে আসবে)
      status: { type: String },
    },
    deliveredAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// অর্ডার আইডিকে সহজে পড়ার জন্য ইনডেক্সিং
orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);