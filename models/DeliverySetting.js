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
    codExtraFee: {
        type: Number,
        min: 0,
        default: 0,
    },
    insideCityName: {
        type: String,
        required: [true, "Please enter Inside City Name"],
        default: "Dhaka",
    },
    weightSlabs: [slabSchema],
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