const mongoose = require("mongoose");

const homepageSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "hero_banner",
        "category_grid",
        "product_grid",
        "campaign_banner",
        "flash_sale",
        "blog_section",
      ],
    },
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "hidden"],
      default: "active",
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomepageSection", homepageSectionSchema);
