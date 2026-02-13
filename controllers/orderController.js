const mongoose = require("mongoose");
const Checkout = require("../models/checkout");
const ProductVariant = require("../models/productVariant");
const Order = require("../models/order");
const Cart = require("../models/cart");
const Address = require("../models/address");

exports.confirmOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { checkoutId, paymentMethod } = req.body;
    const userId = req.user._id;

    /* ===========================
       1️⃣ Load Checkout
    =========================== */

    const checkout = await Checkout.findOne({
      _id: checkoutId,
      userId,
      status: "draft",
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!checkout) {
      throw new Error("Checkout invalid or expired");
    }

    if (!checkout.shippingAddressId) {
      throw new Error("Shipping address missing");
    }

    /* ===========================
       2️⃣ Validate & Deduct Stock
    =========================== */

    for (const item of checkout.items) {
      const variant = await ProductVariant.findById(
        item.variantId
      ).session(session);

      if (!variant) {
        throw new Error("Variant not found");
      }

      if (variant.availableStock < item.quantity) {
        throw new Error(
          `Insufficient stock for ${item.name}`
        );
      }

      // 🔥 Deduct actual stock
      variant.stock -= item.quantity;

      await variant.save({ session });
    }

    /* ===========================
       3️⃣ Snapshot Address
    =========================== */

    const address = await Address.findById(
      checkout.shippingAddressId
    ).session(session);

    if (!address) {
      throw new Error("Address not found");
    }

    /* ===========================
       4️⃣ Create Order
    =========================== */

    const order = await Order.create(
      [
        {
          userId,
          items: checkout.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            quantity: item.quantity,
            price: item.unitPrice,
          })),
          totalAmount: checkout.pricing.payable,
          shippingPrice: checkout.pricing.shipping,

          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            division: address.division,
            district: address.district,
            area: address.area,
            addressLine: address.addressLine,
          },

          paymentMethod,
          paymentStatus:
            paymentMethod === "COD" ? "pending" : "pending",
          orderStatus: "pending",
        },
      ],
      { session }
    );

    /* ===========================
       5️⃣ Update Checkout
    =========================== */

    checkout.status = "completed";
    await checkout.save({ session });

    /* ===========================
       6️⃣ Clear Cart
    =========================== */

    await Cart.deleteOne({ userId }).session(session);

    /* ===========================
       7️⃣ Commit Transaction
    =========================== */

    await session.commitTransaction();
    session.endSession();

    /* ===========================
       8️⃣ COD vs ONLINE Split
    =========================== */

    if (paymentMethod === "COD") {
      return res.json({
        success: true,
        order: order[0],
        paymentRequired: false,
      });
    }

    // 👉 Online Payment Placeholder
    return res.json({
      success: true,
      order: order[0],
      paymentRequired: true,
      message: "Redirect to payment gateway",
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
