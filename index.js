require("dotenv").config();
const express = require("express");

// ✅ Middlewares
const securapi = require("./middleware/secureApi");
const corsConfig = require("./middleware/corsConfig");
// const checklogin = require("./middlewares/checkLogin.js");
// const checkadmin = require("./middlewares/checkAdmin.js");
// const multerErrorHandler = require("./middlewares/uploadErrorHandler");
// const upload = require("./middlewares/upload");

// ✅ Helper
const dbConnection = require("./helpers/dbConnection");

const authRoutes = require("./routes/authRoutes");
    
   


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



// ✅ Root Route (for Render test)----------------------------------------------------------
app.get("/", (req, res) => {
  res.send("✅ North Backend API is running...");
});

// ✅ Start Server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});