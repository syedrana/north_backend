const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
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
  name: { type: String, required: true },
  sku: String,
  attributes: Object,
  image: { type: String },
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
  lineTotal: {
    type: Number,
    required: [true, "lineTotal is required"],
    min: [0, "lineTotal cannot be negative"],
  },

}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user"],
    },
    items: [orderItemSchema],
    pricing: {
      subtotal: { type: Number, required: true },
      shipping: { type: Number, default: 0 },
      codFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true },
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
    paymentInfo: {
      transactionId: String,
      gateway: String,
      currency: { type: String, default: "BDT" },
      paidAt: Date,
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
    },
    cancellationReason: String,

    deliveredAt: Date,

    orderLogs: [
      {
        status: String,
        note: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// অর্ডার আইডিকে সহজে পড়ার জন্য ইনডেক্সিং
orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);