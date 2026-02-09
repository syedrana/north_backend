require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");


// ✅ Middlewares

const corsConfig = require("./middleware/corsConfig");


// ✅ Helper
const dbConnection = require("./helpers/dbConnection");

const authRoutes = require("./routes/authRoutes");   
const productRoutes = require("./routes/productRoutes");  
const productVariantRoutes = require("./routes/productVariantRoutes");  
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const customerRoutes = require("./routes/customerRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const addressRoutes = require("./routes/addressRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes")

const app =express();

// ✅ Database Connection
dbConnection();

// ✅ CORS Middleware
// app.use(corsConfig);
app.use(cookieParser());

// ✅ Middlewares
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// ✅ Static Files
app.use("/uploads", express.static("uploads"));

app.use("/admin", authRoutes);
app.use("/products", productRoutes);
app.use("/productsvariant", productVariantRoutes);
app.use("/categorys", categoryRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);
app.use("/customer", customerRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/address", addressRoutes);
app.use("/deliverysetting", deliveryRoutes);


// ✅ Root Route (for Render test)----------------------------------------------------------
app.get("/", (req, res) => {
  res.send("✅ North Backend API is running...");
});

// ✅ Start Server
const PORT = process.env.PORT || 7000;

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
});

app.use(
  cors({
    origin: "http://localhost:3000", // frontend URL
    credentials: true,
  })
);

app.use(cors({
  origin: ['https://northsquad.vercel.app', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});