const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const uploadToCloudinary = async (fileBuffer) => {
  try {
    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "mlm_users",
          allowed_formats: ["jpg", "jpeg", "png"],
          transformation: [{ width: 500, height: 500, crop: "limit" }],
        },
        (error, result) => {
          if (result) resolve(result);
          else reject(new Error("Cloudinary upload failed: " + error.message));
        }
      );
      Readable.from(fileBuffer).pipe(stream);
    });
  } catch (err) {
    throw new Error("Cloudinary upload error: " + err.message);
  }
};

module.exports = uploadToCloudinary;
