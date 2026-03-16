const multer = require("multer");

// Multer memory storage (buffer ধরে রাখবে)
const storage = multer.memoryStorage();

// ✅ File Filter
const fileFilter = (req, file, cb) => {
  if (/image\/(jpeg|jpg|png)/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, JPEG, PNG files are allowed"), false);
  }
};

// ✅ Multer Middleware
const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: 20 * 1024 * 1024 } // max 2MB
});


// 👉 Export properly
module.exports = upload;