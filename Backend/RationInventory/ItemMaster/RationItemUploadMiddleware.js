const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToCloudinary } = require("../../Config/Cloudinary");

const uploadDirectory = path.join(__dirname, "..", "..", "uploads", "ration_items");

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
]);

const getFileExtension = (filename) => {
    return path.extname(String(filename || "")).toLowerCase();
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDirectory);
    },
    filename: (req, file, callback) => {
        const extension = getFileExtension(file.originalname) || ".bin";
        const sanitizedBaseName = String(path.basename(file.originalname, extension))
            .replace(/[^a-z0-9]/gi, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();

        callback(
            null,
            `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizedBaseName}${extension}`
        );
    },
});

const fileFilter = (req, file, callback) => {
    const extension = getFileExtension(file.originalname);

    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
        return callback(
            Object.assign(new Error("Only image files are allowed"), {
                code: "INVALID_UPLOAD_TYPE",
            })
        );
    }

    callback(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});

const rationItemUpload = upload.single("item_image");

const handleRationItemUpload = (req, res, next) => {
    rationItemUpload(req, res, async (error) => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message || "File upload failed",
                error_code: error.code || "UPLOAD_FAILED",
            });
        }

        if (req.file) {
            try {
                req.file.cloudinaryUrl = await uploadToCloudinary(
                    req.file.path,
                    "ration_items/item_image"
                );
            } catch (uploadError) {
                console.error("Cloudinary upload error in ration item middleware:", uploadError);

                return res.status(500).json({
                    success: false,
                    message: "Cloud upload failed: " + uploadError.message,
                    error_code: "CLOUD_UPLOAD_FAILED",
                });
            }
        }

        return next();
    });
};

module.exports = {
    handleRationItemUpload,
};
