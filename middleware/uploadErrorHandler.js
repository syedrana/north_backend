const multer = require("multer");

const multerErrorHandler = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Max 2MB allowed." });
          }
        }
        // File type or other errors
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

module.exports = multerErrorHandler;
