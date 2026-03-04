const Cart = require("../models/cart");
const ProductVariant = require("../models/productVariant");
const Checkout = require("../models/checkout");
const calculateShipping = require("../utils/calculateShipping");
const Address = require("../models/address");
const calculateCodFee = require("../utils/calculateCodFee");

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

  /* =========================
     REMOVE OLD DRAFT
  ========================= */

  await Checkout.deleteMany({
    userId,
    status: "draft",
  });

  /* =========================
     LOAD CART WITH SNAPSHOT DATA
  ========================= */

  const cart = await Cart.findOne({ userId })
    .populate("items.productId")
    .populate("items.variantId");

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cart is empty",
    });
  }

  /* =========================
     BUILD ITEMS + SNAPSHOT
  ========================= */

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

      /* 🔒 ENTERPRISE — snapshot for shipping */
      variantSnapshot: {
        shipping: variant.shipping,
      },
    });
  }

  /* =========================
     FIND DEFAULT ADDRESS
  ========================= */

  const defaultAddress = await Address.findOne({
    userId,
    isDefault: true,
  }).lean();

  /* =========================
     ESTIMATE SHIPPING (OPTIONAL)
  ========================= */

  let shipping = null;

  if (defaultAddress) {
    try {
      shipping = await calculateShipping({
        items,
        subtotal,
        address: defaultAddress,
      });
    } catch (e) {
      console.log("Shipping estimate skipped:", e.message);
      shipping = null;
    }
  }
 
  /* =========================
     CREATE CHECKOUT
  ========================= */

  const checkout = await Checkout.create({
    userId,
    source: "cart",
    items,

    pricing: {
      subtotal,
      shipping: shipping?.total || 0,
      codFee: 0,
      discount: 0,
      payable: subtotal + (shipping?.total || 0),
    },

    shippingAddressId: defaultAddress._id,

    shippingBreakdown: shipping?.breakdown || null,

    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  res.json({
    success: true,
    checkout,
    shippingEstimated: Boolean(defaultAddress),
  });
};

/**
 * PATCH /checkout/:id
 * 👉 update address only
 */

exports.updateCheckout = async (req, res) => {
  const { id } = req.params;
  const { shippingAddressId } = req.body;

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
    const address = await Address.findOne({
      _id: shippingAddressId,
      userId: req.user._id,
    });

    if (!address) {
      return res.status(400).json({
        success: false,
        message: "Invalid address",
      });
    }

    const shippingResult = await calculateShipping({
      items: checkout.items,
      subtotal: checkout.pricing.subtotal,
      address,
    });

    checkout.shippingAddressId = shippingAddressId;

    checkout.pricing.shipping = shippingResult.total;

    checkout.pricing.payable =
      checkout.pricing.subtotal +
      shippingResult.total -
      (checkout.pricing.discount || 0);

    checkout.shippingBreakdown = shippingResult.breakdown;
  }

  await checkout.save();

  const populatedCheckout = await Checkout.findById(checkout._id)
    .populate("shippingAddressId")
    .populate({
      path: "items.variantId",
      select: "color size images stock",
  });
  
  res.json({
    success: true,
    checkout: populatedCheckout,
  });
};

exports.updatePaymentMethod = async (req, res) => {
  const { checkoutId } = req.params;
  const { paymentMethod } = req.body;

  console.log("chack out: ", checkoutId);

  const checkout = await Checkout.findOne({
    _id: checkoutId,
    userId: req.user._id,
    status: "draft",
  });

  if (!checkout) {
    return res.status(404).json({
      success: false,
      message: "Checkout not found",
    });
  }

  let codFee = 0;

  if (paymentMethod === "COD") {
    codFee = await calculateCodFee(checkout.pricing.subtotal);
  }

  checkout.paymentMethod = paymentMethod;
  checkout.pricing.codFee = codFee;

  checkout.pricing.payable = checkout.pricing.subtotal + checkout.pricing.shipping + codFee - (checkout.pricing.discount || 0);
  
  await checkout.save();

  const populatedCheckout = await Checkout.findById(checkout._id)
    .populate("shippingAddressId")
    .populate({
      path: "items.variantId",
      select: "color size images stock",
    });

  res.json({
    success: true,
    checkout: populatedCheckout,
  });
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

  const items = [
    {
      productId: variant.productId._id,
      variantId: variant._id,
      name: variant.productId.name,
      quantity,
      unitPrice,
      lineTotal,
      variantSnapshot: {
        shipping: variant.shipping,
      },
    },
  ];

  const subtotal = lineTotal;

  /* default address */
  const defaultAddress = await Address.findOne({
    userId,
    isDefault: true,
  }).lean();

  let shipping = null;

  if (defaultAddress) {
    try {
      shipping = await calculateShipping({
        items,
        subtotal,
        address: defaultAddress,
      });
    } catch (e) {
      console.log("Shipping estimate skipped:", e.message);
      shipping = null;
    }
  }

  const checkout = await Checkout.create({
    userId,
    source: "buy_now",
    items,
    pricing: {
      subtotal,
      shipping: shipping?.total || 0,
      codFee: 0,
      discount: 0,
      payable: subtotal + (shipping?.total || 0),
    },
    shippingAddressId: defaultAddress?._id,
    shippingBreakdown: shipping?.breakdown || null,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  res.json({
    success: true,
    checkout,
    shippingEstimated: Boolean(defaultAddress),
  });
};
