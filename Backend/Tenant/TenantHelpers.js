const path = require("path");

const TENANT_STATUSES = [
    "draft",
    "pending_verification",
    "active",
    "notice_period",
    "vacated",
    "blocked",
];

const BED_STATUSES = [
    "vacant",
    "occupied",
    "reserved",
    "maintenance",
];

const PAYMENT_VERIFICATION_STATUSES = [
    "pending",
    "verified",
    "rejected",
];

const DEPOSIT_REFUND_STATUSES = [
    "pending",
    "partially_refunded",
    "refunded",
    "forfeited",
];

const normalizeText = (value) => {
    if (typeof value !== "string") {
        return value || null;
    }

    const normalizedValue = value.trim();

    return normalizedValue || null;
};

const normalizeInteger = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const normalizedValue = Number(value);

    return Number.isInteger(normalizedValue) ? normalizedValue : null;
};

const normalizeNumber = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const normalizedValue = Number(value);

    return Number.isFinite(normalizedValue) ? normalizedValue : null;
};

const normalizeBoolean = (value) => {
    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        return value.toLowerCase() === "true";
    }

    return Boolean(value);
};

const parseJsonField = (value, defaultValue = null) => {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    if (typeof value !== "string") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        return defaultValue;
    }
};

const buildUploadedFileObject = (file) => {
    if (!file) {
        return null;
    }

    return {
        file_name: file.filename,
        original_name: file.originalname,
        file_url: `/uploads/tenant/${file.filename}`,
        mime_type: file.mimetype,
        uploaded_at: new Date().toISOString(),
        size: file.size,
    };
};

const extractAadhaarNumber = (documents = []) => {
    const aadhaarDocument = documents.find((document) => {
        const documentName = String(document.document_name || "").toLowerCase();
        const documentType = String(document.document_type || "").toLowerCase();

        return documentName.includes("aadhaar") || documentType.includes("aadhaar");
    });

    return normalizeText(aadhaarDocument?.document_number);
};

const inferBedStatusFromTenantStatus = (tenantStatus) => {
    const status = String(tenantStatus || "").toLowerCase();
    if (status === "vacated") {
        return "vacant";
    }

    if (status === "draft") {
        return "reserved";
    }

    if (
        [
            "pending_verification",
            "active",
            "notice_period",
        ].includes(status)
    ) {
        return "occupied";
    }

    return "occupied";
};

const ensureEnumValue = (value, allowedValues, fallbackValue) => {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (allowedValues.includes(normalizedValue)) {
        return normalizedValue;
    }

    return fallbackValue;
};

const getCurrentYear = () => {
    return new Date().getFullYear();
};

const generateAdmissionNumber = async (client, institutionId) => {
    const institutionResult = await client.query(`
        SELECT institution_code, institution_name
        FROM institutions
        WHERE id = $1
    `, [institutionId]);

    const institution = institutionResult.rows[0];

    if (!institution) {
        throw Object.assign(new Error("Institution not found"), {
            code: "INSTITUTION_NOT_FOUND",
        });
    }

    const institutionCode = String(
        institution.institution_code ||
        institution.institution_name ||
        `PG${institutionId}`
    )
        .replace(/[^a-z0-9]/gi, "")
        .toUpperCase()
        .slice(0, 6) || `PG${institutionId}`;

    const year = getCurrentYear();
    const prefix = `${institutionCode}-${year}-`;

    const lastAdmissionResult = await client.query(`
        SELECT admission_number
        FROM tenants
        WHERE institution_id = $1
          AND admission_number LIKE $2
        ORDER BY id DESC
        LIMIT 1
    `, [institutionId, `${prefix}%`]);

    const lastAdmissionNumber = lastAdmissionResult.rows[0]?.admission_number || "";
    const lastSequence = Number(lastAdmissionNumber.split("-").pop()) || 0;
    const nextSequence = String(lastSequence + 1).padStart(5, "0");

    return `${prefix}${nextSequence}`;
};

const generateReceiptNumber = async (client) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const prefix = `RCT-${year}${month}-`;

    const result = await client.query(`
        SELECT receipt_number
        FROM tenant_payments
        WHERE receipt_number LIKE $1
        ORDER BY id DESC
        LIMIT 1
    `, [`${prefix}%`]);

    const lastReceiptNumber = result.rows[0]?.receipt_number || "";
    const lastSequence = Number(lastReceiptNumber.split("-").pop()) || 0;
    const nextSequence = String(lastSequence + 1).padStart(5, "0");

    return `${prefix}${nextSequence}`;
};

const getFileExtension = (filename) => {
    return path.extname(String(filename || "")).toLowerCase();
};

module.exports = {
    BED_STATUSES,
    DEPOSIT_REFUND_STATUSES,
    PAYMENT_VERIFICATION_STATUSES,
    TENANT_STATUSES,
    buildUploadedFileObject,
    ensureEnumValue,
    extractAadhaarNumber,
    generateAdmissionNumber,
    generateReceiptNumber,
    getFileExtension,
    inferBedStatusFromTenantStatus,
    normalizeBoolean,
    normalizeInteger,
    normalizeNumber,
    normalizeText,
    parseJsonField,
};
