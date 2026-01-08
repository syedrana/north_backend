require("dotenv").config();
const express = require("express");

// ✅ Middlewares
const securapi = require("./middleware/secureApi");
const corsConfig = require("./middleware/corsConfig");
// const checklogin = require("./middlewares/checkLogin.js");
// const checkadmin = require("./middlewares/checkAdmin.js");


// ✅ Helper
const dbConnection = require("./helpers/dbConnection");

const authRoutes = require("./routes/authRoutes");   
const productRoutes = require("./routes/productRoutes");   
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app =express();

// ✅ Database Connection
dbConnection();

// ✅ CORS Middleware
app.use(corsConfig);

// ✅ Middlewares
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// ✅ Static Files
app.use("/uploads", express.static("uploads"));

app.use("/admin", securapi, authRoutes);
app.use("/products", productRoutes);
app.use("/categorys", categoryRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);


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

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});