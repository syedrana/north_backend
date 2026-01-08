const Cart = require("../models/cartModel");
const ProductVariant = require("../models/productVariantModel");

/**
 * 🛒 Get User Cart
 */
exports.getCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id })
      .populate("items.productId", "name")
      .populate(
        "items.variantId",
        "sku size color price discountPrice images stock"
      );

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ➕ Add To Cart
 */
exports.addToCart = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    if (!variantId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "VariantId and valid quantity are required",
      });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({
        userId: req.user._id,
        items: [],
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.variantId.toString() === variantId
    );

    const existingQty =
      itemIndex > -1 ? cart.items[itemIndex].quantity : 0;

    const totalQty = existingQty + quantity;

    if (variant.stock < totalQty) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = totalQty;
    } else {
      cart.items.push({
        productId: variant.productId,
        variantId,
        quantity,
        price: variant.discountPrice || variant.price,
      });
    }

    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 🔄 Update Cart Item Quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    if (!variantId || !quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "VariantId and valid quantity are required",
      });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock",
      });
    }

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) => item.variantId.toString() === variantId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    item.quantity = quantity;

    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ❌ Remove Cart Item
 */
exports.removeCartItem = async (req, res) => {
  try {
    const { variantId } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.variantId.toString() !== variantId
    );

    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
