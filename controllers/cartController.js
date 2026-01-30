const Cart = require("../models/cart");
const ProductVariant = require("../models/productVariant");

/* =====================================================
   🛒 GET USER CART
===================================================== */
const getCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const cart = await Cart.findOne({
      userId: req.user._id,
      status: "active",
    })
      .populate("items.productId", "name slug")
      .populate(
        "items.variantId",
        "sku size color price discountPrice images stock"
      );

    if (!cart) {
      return res.json({
        success: true,
        cart: null,
        summary: {
          subtotal: 0,
          itemCount: 0,
        },
      });
    }

    let subtotal = 0;
    let itemCount = 0;

    cart.items.forEach((item) => {
      subtotal += item.price * item.quantity;
      itemCount += item.quantity;
    });

    res.json({
      success: true,
      cart,
      summary: {
        subtotal,
        itemCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
   ➕ ADD TO CART
===================================================== */
const addToCart = async (req, res) => {
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

    const sellingPrice = variant.discountPrice ?? variant.price;
    const discount = variant.discountPrice
      ? variant.price - variant.discountPrice
      : 0;

    let cart = await Cart.findOne({
      userId: req.user._id,
      status: "active",
    });

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
      cart.items[itemIndex].price = sellingPrice;
      cart.items[itemIndex].originalPrice = variant.price;
      cart.items[itemIndex].discount = discount;
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

    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
   🔄 UPDATE CART ITEM QUANTITY
===================================================== */
// const updateCartItem = async (req, res) => {
//   try {
//     const { variantId, quantity } = req.body;

//     if (!variantId || !quantity || quantity < 1) {
//       return res.status(400).json({
//         success: false,
//         message: "VariantId and valid quantity are required",
//       });
//     }

//     const variant = await ProductVariant.findById(variantId);
//     if (!variant) {
//       return res.status(404).json({
//         success: false,
//         message: "Product variant not found",
//       });
//     }

//     if (variant.stock < quantity) {
//       return res.status(400).json({
//         success: false,
//         message: "Not enough stock available",
//       });
//     }

//     const cart = await Cart.findOne({
//       userId: req.user._id,
//       status: "active",
//     });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found",
//       });
//     }

//     const item = cart.items.find(
//       (item) => item.variantId.toString() === variantId
//     );

//     if (!item) {
//       return res.status(404).json({
//         success: false,
//         message: "Item not found in cart",
//       });
//     }

//     item.quantity = quantity;
//     item.price = variant.discountPrice ?? variant.price;
//     item.originalPrice = variant.price;
//     item.discount = variant.discountPrice
//       ? variant.price - variant.discountPrice
//       : 0;

//     await cart.save();

//     res.json({ success: true, cart });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


const updateCartItem = async (req, res) => {
  try {
    const { variantId, quantity } = req.body;

    if (!variantId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "VariantId and quantity are required",
      });
    }

    const cart = await Cart.findOne({
      userId: req.user._id,
      status: "active",
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.variantId.toString() === variantId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // 🧹 qty = 0 → remove
    if (quantity < 1) {
      cart.items.splice(itemIndex, 1);
    } else {
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
          message: "Not enough stock available",
        });
      }

      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].price =
        variant.discountPrice ?? variant.price;
      cart.items[itemIndex].originalPrice = variant.price;
      cart.items[itemIndex].discount = variant.discountPrice
        ? variant.price - variant.discountPrice
        : 0;
    }

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return res.json({ success: true, cart: null });
    }

    await cart.save();
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



/* =====================================================
   ❌ REMOVE CART ITEM
===================================================== */
const removeCartItem = async (req, res) => {
  try {
    const { variantId } = req.params;

    const cart = await Cart.findOne({
      userId: req.user._id,
      status: "active",
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.variantId.toString() !== variantId
    );

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id });
      return res.json({
        success: true,
        cart: null,
      });
    }

    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* =====================================================
   🧹 CLEAR CART (FOR CHECKOUT / LOGOUT)
===================================================== */
const clearCart = async (req, res) => {
  try {
    await Cart.deleteOne({
      userId: req.user._id,
      status: "active",
    });

    res.json({
      success: true,
      message: "Cart cleared successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {getCart, addToCart, updateCartItem, removeCartItem, clearCart };