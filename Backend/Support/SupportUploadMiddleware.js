const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToCloudinary } = require("../Config/Cloudinary");

const uploadDirectory = path.join(__dirname, "..", "uploads", "support");

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
]);

const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
]);

const getFileExtension = (filename) => {
    if (!filename) return "";
    const index = filename.lastIndexOf(".");
    return index !== -1 ? filename.substring(index).toLowerCase() : "";
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
            Object.assign(new Error("Only image and PDF files are allowed"), {
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
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1,
    },
});

const supportSingleUpload = upload.single("attachment");

const handleSupportUpload = (req, res, next) => {
    supportSingleUpload(req, res, async (error) => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message || "File upload failed",
                error_code: error.code || "UPLOAD_FAILED",
            });
        }

        if (req.file) {
            try {
                const secureUrl = await uploadToCloudinary(req.file.path, "support/attachments");
                req.file.cloudinaryUrl = secureUrl;
            } catch (uploadError) {
                console.error("Cloudinary upload error in support middleware:", uploadError);
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
    handleSupportUpload,
};
