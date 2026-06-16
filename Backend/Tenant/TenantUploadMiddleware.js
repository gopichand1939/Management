const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToCloudinary } = require("../Config/Cloudinary");

const { getFileExtension } = require("./TenantHelpers");

const uploadDirectory = path.join(__dirname, "..", "uploads", "tenant");

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
        fileSize: 5 * 1024 * 1024,
        files: 8,
    },
});

const tenantUploadFields = upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "payment_proof", maxCount: 1 },
    { name: "aadhaar_file", maxCount: 1 },
    { name: "pan_file", maxCount: 1 },
    { name: "document_files", maxCount: 5 },
]);

const handleTenantUpload = (req, res, next) => {
    tenantUploadFields(req, res, async (error) => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message || "File upload failed",
                error_code: error.code || "UPLOAD_FAILED",
            });
        }

        if (req.files) {
            try {
                const fileFields = Object.keys(req.files);
                for (const field of fileFields) {
                    const filesList = req.files[field];
                    for (const file of filesList) {
                        const secureUrl = await uploadToCloudinary(file.path, `tenant/${field}`);
                        file.cloudinaryUrl = secureUrl;
                    }
                }
            } catch (uploadError) {
                console.error("Cloudinary upload error in middleware:", uploadError);
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
    handleTenantUpload,
};
