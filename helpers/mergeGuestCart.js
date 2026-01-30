const Cart = require("../models/cart");
const ProductVariant = require("../models/productVariant");

const mergeGuestCart = async (userId, guestCart) => {
  let cart = await Cart.findOne({
    userId,
    status: "active",
  });

  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  for (const guestItem of guestCart) {
    const { variantId, quantity } = guestItem;

    const variant = await ProductVariant.findById(variantId);
    if (!variant) continue;

    const sellingPrice = variant.discountPrice ?? variant.price;
    const discount = variant.discountPrice
      ? variant.price - variant.discountPrice
      : 0;

    const existingIndex = cart.items.findIndex(
      (item) => item.variantId.toString() === variantId
    );

    const existingQty =
      existingIndex > -1 ? cart.items[existingIndex].quantity : 0;

    const totalQty = existingQty + quantity;

    if (variant.stock < totalQty) {
      throw new Error(`Stock limit exceeded for ${variant.sku}`);
    }

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = totalQty;
      cart.items[existingIndex].price = sellingPrice;
      cart.items[existingIndex].originalPrice = variant.price;
      cart.items[existingIndex].discount = discount;
    } else {
      cart.items.push({
        productId: variant.productId,
        variantId,
        quantity,
        price: sellingPrice,
        originalPrice: variant.price,
        discount,
      });
    }
  }

  await cart.save();
};


module.exports = {mergeGuestCart};