const cloudinary = require("cloudinary").v2;

const extractPublicId = (url) => {
  try {
    const parts = url.split("/");
    const fileName = parts.pop(); // abc.jpg
    const folder = parts.slice(parts.indexOf("upload") + 1).join("/");

    const publicId = folder + "/" + fileName.split(".")[0];

    return publicId.replace(/^v\d+\//, ""); // remove version
  } catch {
    return null;
  }
};

const deleteFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || imageUrl.startsWith("blob:")) return;

    const publicId = extractPublicId(imageUrl);

    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};

module.exports = deleteFromCloudinary;