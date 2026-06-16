const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a local file to Cloudinary and deletes it locally upon completion.
 * @param {string} filePath - Absolute path to local file.
 * @param {string} folder - Destination folder on Cloudinary.
 * @returns {Promise<string>} Secure URL of uploaded file.
 */
const uploadToCloudinary = async (filePath, folder = "tenant") => {
    try {
        if (!filePath) {
            return null;
        }

        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
            resource_type: "auto",
        });

        // Delete the local file after successful upload to free server space
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return result.secure_url;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        
        // Ensure clean up of local file even on failure
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error("Failed to delete local file after failed upload:", unlinkError);
            }
        }
        
        throw error;
    }
};

module.exports = {
    cloudinary,
    uploadToCloudinary,
};
