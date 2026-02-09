// const Cart = require("../models/cart");
// const ProductVariant = require("../models/productVariant");
// const Checkout = require("../models/checkout");

// /**
//  * GET /checkout
//  * 👉 Page load only (NO CREATE)
//  */
// exports.getCheckout = async (req, res) => {
//   const userId = req.user._id;

//   const checkout = await Checkout.findOne({
//     userId,
//     status: "draft",
//     expiresAt: { $gt: new Date() },
//   })
//   .populate("shippingAddressId")
//   .sort({ createdAt: -1 });

//   res.json({
//     success: true,
//     checkout,
//   });
// };

// /**
//  * POST /checkout
//  * 👉 create checkout ONCE (cart based)
//  */
// exports.createCheckoutFromCart = async (req, res) => {
//   const userId = req.user._id;

//   let checkout = await Checkout.findOne({
//     userId,
//     status: "draft",
//     expiresAt: { $gt: new Date() },
//   });

//   if (checkout) {
//     return res.json({ success: true, checkout });
//   }

//   const cart = await Cart.findOne({ userId })
//     .populate("items.productId")
//     .populate("items.variantId");

//   if (!cart || cart.items.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Cart is empty",
//     });
//   }

//   let subtotal = 0;
//   const items = [];

//   for (const item of cart.items) {
//     const variant = item.variantId;
//     const unitPrice = variant.discountPrice || variant.price;
//     const lineTotal = unitPrice * item.quantity;

//     subtotal += lineTotal;

//     items.push({
//       productId: item.productId._id,
//       variantId: variant._id,
//       name: item.productId.name,
//       quantity: item.quantity,
//       unitPrice,
//       lineTotal,
//     });
//   }

//   const shipping = subtotal >= 3000 ? 0 : 100;

//   checkout = await Checkout.create({
//     userId,
//     source: "cart",
//     items,
//     pricing: {
//       subtotal,
//       shipping,
//       discount: 0,
//       payable: subtotal + shipping,
//     },
//     expiresAt: new Date(Date.now() + 15 * 60 * 1000),
//   });

//   res.json({ success: true, checkout });
// };

// /**
//  * PATCH /checkout/:id
//  * 👉 update address only
//  */
// exports.updateCheckout = async (req, res) => {
//   const { id } = req.params;
//   const { shippingAddressId } = req.body;

//   const checkout = await Checkout.findOne({
//     _id: id,
//     userId: req.user._id,
//     status: "draft",
//   });

//   if (!checkout) {
//     return res.status(404).json({
//       success: false,
//       message: "Checkout not found",
//     });
//   }

//   checkout.shippingAddressId = shippingAddressId;
//   await checkout.save();

//   res.json({ success: true, checkout });
// };

// /**
//  * POST /checkout/buy-now
//  */
// exports.buyNowCheckout = async (req, res) => {
//   const { variantId, quantity } = req.body;

//   const variant = await ProductVariant.findById(variantId).populate("productId");

//   const unitPrice = variant.discountPrice || variant.price;
//   const lineTotal = unitPrice * quantity;

//   const checkout = await Checkout.create({
//     userId: req.user._id,
//     source: "buy_now",
//     items: [
//       {
//         productId: variant.productId._id,
//         variantId: variant._id,
//         name: variant.productId.name,
//         quantity,
//         unitPrice,
//         lineTotal,
//       },
//     ],
//     pricing: {
//       subtotal: lineTotal,
//       shipping: 100,
//       discount: 0,
//       payable: lineTotal + 100,
//     },
//     expiresAt: new Date(Date.now() + 15 * 60 * 1000),
//   });

//   res.json({ success: true, checkout });
// };


















const Cart = require("../models/cart");
const ProductVariant = require("../models/productVariant");
const Checkout = require("../models/checkout");
const calculateShipping = require("../utils/calculateShipping");
const Address = require("../models/address");

/**
 * GET /checkout
 * 👉 Page load only (NO CREATE)
 */
exports.getCheckout = async (req, res) => {
  const userId = req.user._id;

  const checkout = await Checkout.findOne({
    userId,
    status: "draft",
    expiresAt: { $gt: new Date() },
  })
    .populate("shippingAddressId")
    .populate({
      path: "items.variantId",
      select: "color size images stock",
    })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    checkout,
  });
};

/**
 * POST /checkout
 * 👉 create checkout from CART
 * 👉 delete old draft first
 */
exports.createCheckoutFromCart = async (req, res) => {
  const userId = req.user._id;

  // 🔥 delete previous draft checkout
  await Checkout.deleteMany({
    userId,
    status: "draft",
  });

  const cart = await Cart.findOne({ userId })
    .populate("items.productId")
    .populate("items.variantId");

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cart is empty",
    });
  }

  let subtotal = 0;
  const items = [];

  for (const item of cart.items) {
    const variant = item.variantId;
    const unitPrice = variant.discountPrice || variant.price;
    const lineTotal = unitPrice * item.quantity;

    subtotal += lineTotal;

    items.push({
      productId: item.productId._id,
      variantId: variant._id,
      name: item.productId.name,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
    });
  }

  // const shipping = subtotal >= 3000 ? 0 : 100;
  const address = await Address.findById(userId);

  const shipping = await calculateShipping({
    subtotal: subtotal,
    address,
    paymentMethod: "COD",
  });

  console.log("subtotal :", subtotal);
console.log("shipping :", shipping);
  const checkout = await Checkout.create({
    userId,
    source: "cart",
    items,
    pricing: {
      subtotal,
      shipping,
      discount: 0,
      payable: subtotal + shipping,
    },
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  res.json({ success: true, checkout });
};

/**
 * PATCH /checkout/:id
 * 👉 update address only
 */
// exports.updateCheckout = async (req, res) => {
//   const { id } = req.params;
//   const { shippingAddressId } = req.body;

//   const checkout = await Checkout.findOne({
//     _id: id,
//     userId: req.user._id,
//     status: "draft",
//   });

//   if (!checkout) {
//     return res.status(404).json({
//       success: false,
//       message: "Checkout not found",
//     });
//   }

//   checkout.shippingAddressId = shippingAddressId;
//   await checkout.save();

//   res.json({ success: true, checkout });
// };

exports.updateCheckout = async (req, res) => {
  const { id } = req.params;
  const { shippingAddressId, paymentMethod } = req.body;

  const checkout = await Checkout.findOne({
    _id: id,
    userId: req.user._id,
    status: "draft",
  });

  if (!checkout) {
    return res.status(404).json({
      success: false,
      message: "Checkout not found",
    });
  }

  if (shippingAddressId) {
    checkout.shippingAddressId = shippingAddressId;

    const address = await Address.findById(shippingAddressId);

    const shipping = await calculateShipping({
      subtotal: checkout.pricing.subtotal,
      address,
      paymentMethod: paymentMethod || "COD",
    });

    checkout.pricing.shipping = shipping;
    checkout.pricing.payable =
      checkout.pricing.subtotal +
      shipping -
      checkout.pricing.discount;
  }

  if (paymentMethod) {
    checkout.paymentMethod = paymentMethod;
  }

  await checkout.save();

  res.json({ success: true, checkout });
};

/**
 * POST /checkout/buy-now
 * 👉 delete old draft first
 */
exports.buyNowCheckout = async (req, res) => {
  const { variantId, quantity } = req.body;
  const userId = req.user._id;

  // 🔥 delete previous draft checkout
  await Checkout.deleteMany({
    userId,
    status: "draft",
  });

  const variant = await ProductVariant.findById(variantId).populate(
    "productId"
  );

  if (!variant) {
    return res.status(404).json({
      success: false,
      message: "Variant not found",
    });
  }

  const unitPrice = variant.discountPrice || variant.price;
  const lineTotal = unitPrice * quantity;

  const checkout = await Checkout.create({
    userId,
    source: "buy_now",
    items: [
      {
        productId: variant.productId._id,
        variantId: variant._id,
        name: variant.productId.name,
        quantity,
        unitPrice,
        lineTotal,
      },
    ],
    pricing: {
      subtotal: lineTotal,
      shipping: 100,
      discount: 0,
      payable: lineTotal + 100,
    },
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  res.json({ success: true, checkout });
};
