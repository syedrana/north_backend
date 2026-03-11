const mongoose = require("mongoose");

const flashSaleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Flash sale title is required"],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
    ],
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.FlashSale || mongoose.model("FlashSale", flashSaleSchema);
