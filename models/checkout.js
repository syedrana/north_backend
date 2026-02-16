const mongoose = require("mongoose");

const checkoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ["cart", "buy_now"],
      default: "cart",
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductVariant", 
          required: true,
        },
        name: String,
        quantity: Number,
        unitPrice: Number,
        lineTotal: Number,
        variantSnapshot: {
          shipping: {
            weightGram: Number,
            extraShippingFee: Number,
            bulky: Boolean,
          },
        },
      },
    ],

    pricing: {
      subtotal: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      codFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      payable: { type: Number, default: 0 },
    },

    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "completed", "expired"],
      default: "draft",
      index: true,
    },

    expiresAt: {
      type: Date,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Checkout", checkoutSchema);
