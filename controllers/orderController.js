const mongoose = require("mongoose");
const Order = require("../models/order");
const Cart = require("../models/cart");
const ProductVariant = require("../models/productVariant");

exports.createCODOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      throw new Error("Shipping address is required");
    }

    // 1️⃣ Load cart
    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.variantId")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    let totalAmount = 0;
    const orderItems = [];

    // 2️⃣ Loop cart items
    for (const item of cart.items) {
      const variant = await ProductVariant.findById(item.variantId._id).session(session);

      if (!variant) {
        throw new Error("Product variant not found");
      }

      if (variant.stock < item.quantity) {
        throw new Error(`Insufficient stock for SKU ${variant.sku}`);
      }

      const unitPrice =
        variant.discountPrice > 0 ? variant.discountPrice : variant.price;

      totalAmount += unitPrice * item.quantity;

      orderItems.push({
        productId: item.productId._id,
        variantId: variant._id,
        name: item.productId.name,
        quantity: item.quantity,
        price: unitPrice,
      });

      // 3️⃣ Deduct stock
      await ProductVariant.updateOne(
        { _id: variant._id },
        { $inc: { stock: -item.quantity } },
        { session }
      );
    }

    // 4️⃣ Create order
    const order = await Order.create(
      [
        {
          userId,
          items: orderItems,
          totalAmount,
          shippingPrice: 0,
          shippingAddress,
          paymentMethod: "COD",
          paymentStatus: "pending",
          orderStatus: "pending",
        },
      ],
      { session }
    );

    // 5️⃣ Clear cart
    await Cart.deleteOne({ userId }).session(session);

    // 6️⃣ Commit
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: order[0],
    });
  } catch (error) {
    // ❌ Rollback
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
