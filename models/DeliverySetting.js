const mongoose = require("mongoose");
const { Schema } = mongoose;

const slabSchema = new mongoose.Schema({
  uptoGram: { type: Number, required: true, min: 1 },
  insideExtra: { type: Number, required: true, min: 0 },
  outsideExtra: { type: Number, required: true, min: 0 },
}, { _id: false });


const deliverySettingSchema = new Schema({
    insideCityFee: {
        type: Number,
        required: [true, "Please enter Inside City Fee"],
        min: 0,
        default: 80,
    },
    outsideCityFee: {
        type: Number,
        required: [true, "Please enter Outside City Fee"],
        min: 0,
        default: 150,
    },
    freeAbove: {
        type: Number,
        required: [true, "Please enter Free Above"],
        min: 0,
        default: 3000,
    },
    insideCityName: {
        type: String,
        required: [true, "Please enter Inside City Name"],
        default: "Dhaka",
    },
    bulkyInsideFee: {
        type: Number,
        required: [true, "Please enter Bulky Inside Fee"],
        default: 40
    },
    bulkyOutsideFee: {
        type: Number,
        required: [true, "Please enter Bulky Outside Fee"],
        default: 80
    },

    weightSlabs: [slabSchema],

    codFeeType: {
        type: String,
        enum: ["slab"],
        default: "slab",
    },
    codSlabs: [
        {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        fee: { type: Number, required: true },
        },
    ],
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

deliverySettingSchema.index(
    { isActive: 1 },
    { unique: true, partialFilterExpression: { isActive: true}}
);

deliverySettingSchema.pre("save", function() {
  if (this.weightSlabs?.length) {
    this.weightSlabs.sort((a,b)=> a.uptoGram - b.uptoGram);
  }
});


module.exports = mongoose.model("DeliverySetting", deliverySettingSchema);