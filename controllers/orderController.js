const mongoose = require("mongoose");
const Checkout = require("../models/checkout");
const ProductVariant = require("../models/productVariant");
const Order = require("../models/order");
const Cart = require("../models/cart");
const Address = require("../models/address");
// const generateOrderNumber = require("../utils/generateOrderNumber");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");


exports.confirmOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { checkoutId } = req.body;
    const userId = req.user._id;

    if (!checkoutId) {
      return res.status(400).json({
        success: false,
        message: "Checkout ID required",
      });
    }

    session.startTransaction();

    /* ===============================
       1️⃣ LOAD CHECKOUT
    =============================== */

    const checkout = await Checkout.findOne({
      _id: checkoutId,
      userId,
      status: "draft",
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!checkout) throw new Error("Checkout invalid or expired");

    if (!checkout.shippingAddressId) {
      throw new Error("Shipping address missing in checkout");
    }

    /* ===============================
       2️⃣ LOAD ADDRESS SNAPSHOT
    =============================== */

    const address = await Address.findById(
      checkout.shippingAddressId
    ).session(session);

    if (!address) {
      throw new Error("Shipping address not found");
    }

    /* ===============================
       3️⃣ LOAD VARIANTS BULK
    =============================== */

    const variantIds = checkout.items.map(i => i.variantId);

    const variants = await ProductVariant.find({
      _id: { $in: variantIds },
    }).session(session);

    const variantMap = new Map();

    variants.forEach(v => {
      variantMap.set(v._id.toString(), v);
    });

    /* ===============================
       4️⃣ STOCK CHECK + SNAPSHOT
    =============================== */

    const orderItems = [];

    for (const item of checkout.items) {

      const variant = variantMap.get(item.variantId.toString());

      if (!variant) throw new Error("Variant not found");

      const availableStock =
        variant.stock - (variant.reservedStock || 0);

      if (availableStock < item.quantity) {
        throw new Error(`Stock not available for ${variant.sku}`);
      }

      // deduct stock
      variant.stock -= item.quantity;

      await variant.save({ session });

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,

        name: item.name,
        sku: variant.sku,

        attributes: {
          size: variant.size,
          color: variant.color,
        },

        image: variant.images?.[0]?.url || "",

        quantity: item.quantity,
        price: item.unitPrice,
        lineTotal: item.unitPrice * item.quantity,
      });
    }

    /* ===============================
       5️⃣ ORDER NUMBER
    =============================== */

    const orderNumber =
      "ORD-" +
      Math.floor(100000 + Math.random() * 900000) +
      "-" +
      Date.now().toString().slice(-4);

    /* ===============================
       6️⃣ PAYMENT METHOD MAP
    =============================== */

    let paymentMethodFinal = "COD";

    if (checkout.paymentMethod === "online") {
      paymentMethodFinal = "SSLCOMMERZ";
    }

    /* ===============================
       7️⃣ PAYMENT STATUS
    =============================== */

    let paymentStatus = "pending";

    if (paymentMethodFinal !== "COD") {
      paymentStatus = "paid";
    }

    /* ===============================
       8️⃣ CREATE ORDER
    =============================== */

    const order = await Order.create(
      [
        {
          userId,
          orderNumber,

          items: orderItems,

          pricing: {
            subtotal: checkout.pricing.subtotal,
            shipping: checkout.pricing.shipping || 0,
            codFee: checkout.pricing.codFee || 0,
            discount: checkout.pricing.discount || 0,
            tax: checkout.pricing.tax || 0,
            total: checkout.pricing.payable,
          },

          paymentMethod: paymentMethodFinal,
          paymentStatus,

          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            division: address.division,
            district: address.district,
            area: address.area,
            addressLine: address.addressLine,
          },

          orderStatus: "pending",

          orderLogs: [
            {
              status: "pending",
              note: "Order placed successfully",
            },
          ],
        },
      ],
      { session }
    );

    /* ===============================
       9️⃣ UPDATE CHECKOUT
    =============================== */

    checkout.status = "completed";
    await checkout.save({ session });

    /* ===============================
      🔟 CLEAR CART
    =============================== */
    await Cart.deleteOne({ userId }).session(session);

    /* ===============================
      1️⃣1️⃣ COMMIT
    =============================== */

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Order placed successfully",
      orderId: order[0]._id,
      orderNumber: order[0].orderNumber,
    });

  } catch (error) {

    await session.abortTransaction();
    session.endSession();

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message || "Order failed",
    });
  }
};


exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(id).session(session);

    if (!order) throw new Error("Order not found");

    /* ========= STOCK RESTORE ========= */

    if (status === "cancelled" && order.orderStatus !== "cancelled") {
      for (const item of order.items) {
        const variant = await ProductVariant.findById(
          item.variantId
        ).session(session);

        if (variant) {
          variant.stock += item.quantity;
          await variant.save({ session });
        }
      }
    }

    order.orderStatus = status;

    if (status === "delivered") {
      order.deliveredAt = new Date();
    }

    /* ========= LOG ========= */

    order.orderLogs.push({
      status,
      note: note || "",
      updatedAt: new Date(),
    });

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, order });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};



exports.getSingleOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.variantId");

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  res.json({
    success: true,
    order,
  });
};


exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const pricing = order.pricing || {};

    const subtotal = pricing.subtotal || 0;
    const shipping = pricing.shipping || 0;
    const codFee = pricing.codFee || 0;
    const discount = pricing.discount || 0;
    const total = pricing.total || 0;

    /* ================= PDF INIT ================= */

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const fontPath = path.join(
      __dirname,
      "../fonts/NotoSans-Regular.ttf"
    );

    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderNumber}.pdf`
    );

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    /* ================= HEADER FUNCTION ================= */

    const drawHeader = () => {
      const logoPath = path.join(__dirname, "../public/logo.png");

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 40, { width: 110 });
      }

      doc
        .fontSize(20)
        .text("INVOICE", 400, 40, { align: "right" });

      doc
        .fontSize(10)
        .text("Your Store Name", 400, 65, { align: "right" })
        .text("Dhaka, Bangladesh", { align: "right" })
        .text("Phone: 01XXXXXXXXX", { align: "right" })
        .text("Email: support@yourstore.com", { align: "right" });

      doc.moveDown(3);
    };

    drawHeader();

    /* ================= ORDER INFO ================= */

    doc
      .fontSize(11)
      .text(`Order Number: ${order.orderNumber}`)
      .text(`Order Date: ${new Date(order.createdAt).toDateString()}`)
      .text(`Payment: ${order.paymentMethod?.toUpperCase() || "COD"}`);

    doc.moveDown();

    /* ================= CUSTOMER ================= */

    const addr = order.shippingAddress || {};

    doc
      .fontSize(12)
      .text("Bill To:", { underline: true });

    doc
      .fontSize(10)
      .text(addr.fullName || "")
      .text(addr.phone || "")
      .text(addr.addressLine || "")
      .text(`${addr.area || ""}, ${addr.district || ""}`);

    doc.moveDown();

    /* ================= TABLE ================= */

    const itemX = 40;
    const qtyX = 300;
    const priceX = 360;
    const totalX = 460;

    let y = doc.y;

    const drawTableHeader = () => {
      doc
        .fontSize(11)
        .text("Item", itemX, y)
        .text("Qty", qtyX, y)
        .text("Price", priceX, y)
        .text("Total", totalX, y);

      doc.moveTo(40, y + 15)
        .lineTo(550, y + 15)
        .stroke();

      y += 25;
    };

    drawTableHeader();

    /* ================= MULTI PAGE ITEMS ================= */

    order.items.forEach((item, index) => {
      const lineTotal = item.price * item.quantity;

      if (y > 700) {
        doc.addPage();
        drawHeader();
        y = 100;
        drawTableHeader();
      }

      doc
        .fontSize(10)
        .text(item.name, itemX, y)
        .text(String(item.quantity), qtyX, y)
        .text(`৳ ${item.price}`, priceX, y)
        .text(`৳ ${lineTotal}`, totalX, y);

      y += 20;
    });

    /* ================= SUMMARY BOX ================= */

    const summaryY = y + 20;

    doc
      .rect(340, summaryY, 200, 120)
      .stroke();

    doc
      .fontSize(10)
      .text(`Subtotal: ৳ ${subtotal}`, 350, summaryY + 10)
      .text(`Delivery: ৳ ${shipping}`, 350, summaryY + 30)
      .text(`COD Fee: ৳ ${codFee}`, 350, summaryY + 50)
      .text(`Discount: ৳ ${discount}`, 350, summaryY + 70);

    doc
      .fontSize(14)
      .text(`Total: ৳ ${total}`, 350, summaryY + 95);

    /* ================= PAYMENT BADGE ================= */

    doc
      .fillColor("#4CAF50")
      .rect(40, summaryY + 20, 150, 30)
      .fill()
      .fillColor("white")
      .fontSize(11)
      .text(
        order.paymentMethod === "cod"
          ? "Cash on Delivery"
          : "PAID",
        45,
        summaryY + 28
      );

    doc.fillColor("black");

    /* ================= SIGNATURE AREA ================= */

    const signY = summaryY + 160;

    doc.moveTo(60, signY)
      .lineTo(200, signY)
      .stroke();

    doc.text("Authorized Signature", 60, signY + 5);

    doc.moveTo(350, signY)
      .lineTo(500, signY)
      .stroke();

    doc.text("Customer Signature", 350, signY + 5);

    /* ================= FOOTER ================= */

    doc
      .fontSize(9)
      .text(
        "This is a computer generated invoice and does not require physical signature.",
        40,
        760,
        { align: "center" }
      );

    doc.end();
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};





exports.getMyOrders = async (req, res) => {

  const orders = await Order.find({
    userId: req.user._id,
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    orders,
  });
};
