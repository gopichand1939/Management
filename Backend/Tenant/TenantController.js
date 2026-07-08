const {
    BED_STATUSES,
    DEPOSIT_REFUND_STATUSES,
    PAYMENT_VERIFICATION_STATUSES,
    TENANT_STATUSES,
    buildUploadedFileObject,
    ensureEnumValue,
    extractAadhaarNumber,
    normalizeInteger,
    normalizeNumber,
    normalizeText,
    parseJsonField,
} = require("./TenantHelpers");
const {
    createTenantOnboarding,
    createTenantPayment,
    deleteTenantById,
    findBedWithHierarchyById,
    getActiveTenants,
    getTenantActivityLogs,
    getTenantByIdWithPayments,
    getTenantDashboardStats,
    getTenantPayments,
    getVacantBeds,
    getVacatedTenants,
    transferTenantBed,
    updateTenantOnboarding,
    vacateTenantStay,
    verifyTenantPayment,
} = require("./TenantModel");

const isPgAdminRequest = (req) => {
    return req.user?.role === "pg_admin";
};

const resolveInstitutionId = (req, body) => {
    return isPgAdminRequest(req)
        ? normalizeInteger(req.pgAdmin.institution_id)
        : normalizeInteger(body.institution_id);
};

const normalizeDocuments = (documents, files = {}) => {
    const parsedDocuments = Array.isArray(documents) ? documents : [];
    const uploadedDocuments = files.document_files || [];
    
    // Gather all uploaded files to search by name
    const allUploadedFiles = [];
    if (files.document_files) allUploadedFiles.push(...files.document_files);
    if (files.aadhaar_file) allUploadedFiles.push(...files.aadhaar_file);
    if (files.pan_file) allUploadedFiles.push(...files.pan_file);

    let docFilesIndex = 0;

    return parsedDocuments.map((document, index) => {
        let uploadedFile = null;
        if (document.original_file_name) {
            uploadedFile = allUploadedFiles.find(
                (f) => f.originalname === document.original_file_name
            );
        }

        if (!uploadedFile && document.document_type !== "aadhaar" && document.document_type !== "pan") {
            uploadedFile = uploadedDocuments[docFilesIndex];
            docFilesIndex += 1;
        }

        const fileMeta = buildUploadedFileObject(uploadedFile);

        return {
            document_name: normalizeText(document.document_name) || `Document ${index + 1}`,
            document_type: normalizeText(document.document_type) || "general",
            document_number: normalizeText(document.document_number),
            file_name: fileMeta?.file_name || normalizeText(document.file_name),
            file_url: fileMeta?.file_url || normalizeText(document.document_url || document.file_url),
            mime_type: fileMeta?.mime_type || normalizeText(document.mime_type),
        };
    });
};

const buildSpecialDocuments = (files = {}) => {
    const documents = [];
    const aadhaarFile = buildUploadedFileObject(files.aadhaar_file?.[0]);
    const panFile = buildUploadedFileObject(files.pan_file?.[0]);

    if (aadhaarFile) {
        documents.push({
            document_name: "Aadhaar",
            document_type: "aadhaar",
            document_number: null,
            ...aadhaarFile,
        });
    }

    if (panFile) {
        documents.push({
            document_name: "PAN",
            document_type: "pan",
            document_number: null,
            ...panFile,
        });
    }

    return documents;
};

const normalizeTenantPayload = (req) => {
    const { body } = req;
    const files = req.files || {};
    const admission = parseJsonField(body.admission, body.admission || {}) || {};
    const basicDetails = parseJsonField(body.basic_details, body.basic_details || {}) || {};
    const guardianDetails = parseJsonField(
        body.guardian_details,
        body.guardian_details || {}
    ) || {};
    const paymentDetails = parseJsonField(body.payment, body.payment || {}) || {};
    const documentsFromBody = parseJsonField(body.documents, body.documents || []) || [];
    const uploadedProfilePhoto = buildUploadedFileObject(files.profile_photo?.[0]);
    const uploadedPaymentProof = buildUploadedFileObject(files.payment_proof?.[0]);

    const rawDocuments = [
        ...normalizeDocuments(documentsFromBody, files),
        ...buildSpecialDocuments(files),
    ];

    const mergedDocs = {};
    for (const doc of rawDocuments) {
        const type = doc.document_type || "general";
        const name = (doc.document_name || "").toLowerCase();
        const key = `${type}-${name}`;

        if (!mergedDocs[key]) {
            mergedDocs[key] = { ...doc };
        } else {
            const existing = mergedDocs[key];
            existing.document_number = doc.document_number || existing.document_number;
            if (doc.file_url) {
                existing.file_name = doc.file_name || existing.file_name;
                existing.file_url = doc.file_url;
                existing.mime_type = doc.mime_type || existing.mime_type;
            }
        }
    }
    const documents = Object.values(mergedDocs);

    const aadhaarNumber = normalizeText(body.aadhaar_number) || extractAadhaarNumber(documents);
    const normalizedPaymentStatus =
        normalizeText(paymentDetails.status || body.payment_status) || "completed";
    const normalizedVerificationStatus = ensureEnumValue(
        paymentDetails.verification_status || body.verification_status,
        PAYMENT_VERIFICATION_STATUSES,
        normalizedPaymentStatus === "completed" ? "verified" : "pending"
    );
    const billingCycleType = normalizeText(
        paymentDetails.billing_cycle_type || body.billing_cycle_type
    ) || "anniversary";

    return {
        institution_id: resolveInstitutionId(req, body),
        floor_id: normalizeInteger(admission.floor_id || body.floor_id),
        room_id: normalizeInteger(admission.room_id || body.room_id),
        bed_id: normalizeInteger(admission.bed_id || body.bed_id),
        full_name: normalizeText(basicDetails.full_name || body.full_name || body.tenant_name),
        phone: normalizeText(basicDetails.phone || body.phone),
        email: normalizeText(basicDetails.email || body.email)?.toLowerCase() || null,
        gender: normalizeText(basicDetails.gender || body.gender),
        date_of_birth: normalizeText(basicDetails.date_of_birth || body.date_of_birth),
        occupation: normalizeText(basicDetails.occupation || body.occupation),
        company_name: normalizeText(basicDetails.company_name || body.company_name),
        address: normalizeText(basicDetails.address || body.address),
        city: normalizeText(basicDetails.city || body.city),
        state: normalizeText(basicDetails.state || body.state),
        pincode: normalizeText(basicDetails.pincode || body.pincode),
        check_in_date: normalizeText(admission.check_in_date || body.check_in_date),
        expected_checkout_date: normalizeText(
            admission.expected_checkout_date || body.expected_checkout_date
        ),
        guardian_name: normalizeText(guardianDetails.guardian_name || body.guardian_name),
        guardian_phone: normalizeText(guardianDetails.guardian_phone || body.guardian_phone),
        guardian_relation: normalizeText(
            guardianDetails.guardian_relation || body.guardian_relation
        ),
        emergency_contact_name: normalizeText(
            guardianDetails.emergency_contact_name || body.emergency_contact_name
        ),
        emergency_contact_phone: normalizeText(
            guardianDetails.emergency_contact_phone || body.emergency_contact_phone
        ),
        documents,
        legacy_documents: documents.map((document) => ({
            document_name: document.document_name,
            document_type: document.document_type,
            document_url: document.file_url,
            document_number: document.document_number,
        })),
        profile_photo: uploadedProfilePhoto || parseJsonField(body.profile_photo, null),
        aadhaar_number: aadhaarNumber,
        notes: normalizeText(body.notes),
        status: ensureEnumValue(body.status, TENANT_STATUSES, "active"),
        security_deposit: normalizeNumber(body.security_deposit),
        deposit_paid: normalizeNumber(body.deposit_paid),
        refundable_amount: normalizeNumber(body.refundable_amount),
        deposit_refund_status: ensureEnumValue(
            body.deposit_refund_status,
            DEPOSIT_REFUND_STATUSES,
            "pending"
        ),
        agreed_monthly_rent: normalizeNumber(
            paymentDetails.agreed_monthly_rent || body.agreed_monthly_rent
        ),
        billing_cycle_type: [
            "anniversary",
            "calendar_month_prorated",
        ].includes(billingCycleType)
            ? billingCycleType
            : "anniversary",
        created_by: req.user?.id || null,
        payment: {
            amount: normalizeNumber(paymentDetails.amount || body.payment_amount),
            payment_type: normalizeText(paymentDetails.payment_type || body.payment_type),
            payment_mode: normalizeText(paymentDetails.payment_mode || body.payment_mode),
            payment_date: normalizeText(paymentDetails.payment_date || body.payment_date),
            reference_number: normalizeText(
                paymentDetails.reference_number || body.reference_number
            ),
            payment_proof_url:
                uploadedPaymentProof?.file_url ||
                normalizeText(paymentDetails.payment_proof_url || body.payment_proof_url),
            verification_status: normalizedVerificationStatus,
            notes: normalizeText(paymentDetails.notes || body.payment_notes),
            status: normalizedPaymentStatus,
            billing_cycle_type: [
                "anniversary",
                "calendar_month_prorated",
            ].includes(billingCycleType)
                ? billingCycleType
                : "anniversary",
        },
    };
};

const validateTenantPayload = (data) => {
    if (!data.institution_id) {
        return "Institution is required";
    }

    if (!data.floor_id || !data.room_id || !data.bed_id) {
        return "Floor, room and bed selection are required";
    }

    if (!data.full_name) {
        return "Tenant full name is required";
    }

    if (!data.phone) {
        return "Tenant phone is required";
    }

    if (!/^\d{10,15}$/.test(String(data.phone))) {
        return "Tenant phone must be 10 to 15 digits";
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
        return "Tenant email is invalid";
    }

    if (!data.check_in_date) {
        return "Check-in date is required";
    }

    if (!data.agreed_monthly_rent || Number(data.agreed_monthly_rent) <= 0) {
        return "Total monthly rent is required";
    }

    return null;
};

const mapTenantError = (error) => {
    if (error.code === "BED_NOT_FOUND") {
        return {
            statusCode: 400,
            message: "Selected bed does not exist for the chosen institution hierarchy",
        };
    }

    if (error.code === "BED_NOT_VACANT") {
        return {
            statusCode: 400,
            message: "Selected bed is not vacant",
        };
    }

    if (error.code === "BED_UNDER_MAINTENANCE") {
        return {
            statusCode: 400,
            message: "Selected bed is under maintenance",
        };
    }

    if (error.code === "TENANT_NOT_FOUND") {
        return {
            statusCode: 404,
            message: "Tenant not found",
        };
    }

    if (error.code === "DUPLICATE_PHONE") {
        return {
            statusCode: 400,
            message: "Tenant phone already exists",
        };
    }

    if (error.code === "DUPLICATE_EMAIL") {
        return {
            statusCode: 400,
            message: "Tenant email already exists",
        };
    }

    if (error.code === "DUPLICATE_AADHAAR") {
        return {
            statusCode: 400,
            message: "Tenant Aadhaar already exists",
        };
    }

    if (error.code === "INSTITUTION_NOT_FOUND") {
        return {
            statusCode: 400,
            message: "Institution not found",
        };
    }

    if (error.code === "23505") {
        return {
            statusCode: 400,
            message: "A unique tenant or payment field already exists",
        };
    }

    return {
        statusCode: 500,
        message: error.message || "Tenant operation failed",
    };
};

const addTenant = async (req, res) => {
    try {
        const data = normalizeTenantPayload(req);
        const validationMessage = validateTenantPayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const tenant = await createTenantOnboarding(data);

        return res.status(201).json({
            success: true,
            message: "Tenant onboarding completed successfully",
            tenant,
        });
    } catch (error) {
        console.error("Tenant create failed:", error);

        const mappedError = mapTenantError(error);

        return res.status(mappedError.statusCode).json({
            success: false,
            message: mappedError.message,
        });
    }
};

const listActiveTenants = async (req, res) => {
    try {
        const statuses = Array.isArray(req.body.statuses)
            ? req.body.statuses.filter((status) => TENANT_STATUSES.includes(status))
            : undefined;

        const tenants = await getActiveTenants(
            isPgAdminRequest(req) ? req.pgAdmin.institution_id : null,
            normalizeText(req.body.search) || "",
            statuses && statuses.length ? statuses : undefined
        );

        return res.status(200).json({
            success: true,
            message: "Active tenants fetched successfully",
            tenants,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Active tenants fetch failed",
        });
    }
};

const listVacantBeds = async (req, res) => {
    try {
        const beds = await getVacantBeds(
            isPgAdminRequest(req) ? req.pgAdmin.institution_id : null,
            normalizeText(req.body.search) || ""
        );

        return res.status(200).json({
            success: true,
            message: "Vacant beds fetched successfully",
            beds,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Vacant beds fetch failed",
        });
    }
};

const listTenantPayments = async (req, res) => {
    try {
        const payments = await getTenantPayments(
            isPgAdminRequest(req) ? req.pgAdmin.institution_id : null,
            normalizeText(req.body.search) || "",
            normalizeInteger(req.body.tenant_id)
        );

        return res.status(200).json({
            success: true,
            message: "Tenant payments fetched successfully",
            payments,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Tenant payments fetch failed",
        });
    }
};

const listVacatedTenants = async (req, res) => {
    try {
        const statuses = Array.isArray(req.body.statuses)
            ? req.body.statuses.filter((status) => TENANT_STATUSES.includes(status))
            : ["vacated"];

        const tenants = await getVacatedTenants(
            isPgAdminRequest(req) ? req.pgAdmin.institution_id : null,
            normalizeText(req.body.search) || "",
            statuses
        );

        return res.status(200).json({
            success: true,
            message: "Vacated tenants fetched successfully",
            tenants,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Vacated tenants fetch failed",
        });
    }
};

const viewTenant = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.id);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant id is required",
            });
        }

        const tenant = await getTenantByIdWithPayments(tenantId);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Tenant not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(tenant.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this tenant",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tenant fetched successfully",
            tenant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Tenant fetch failed",
        });
    }
};

const editTenant = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.id);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant id is required",
            });
        }

        const existingTenant = await getTenantByIdWithPayments(tenantId);

        if (!existingTenant) {
            return res.status(404).json({
                success: false,
                message: "Tenant not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(existingTenant.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this tenant",
            });
        }

        const data = {
            ...normalizeTenantPayload(req),
            id: tenantId,
        };
        const validationMessage = validateTenantPayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const tenant = await updateTenantOnboarding(data);

        return res.status(200).json({
            success: true,
            message: "Tenant updated successfully",
            tenant,
        });
    } catch (error) {
        console.error("Tenant update failed:", error);

        const mappedError = mapTenantError(error);

        return res.status(mappedError.statusCode).json({
            success: false,
            message: mappedError.message,
        });
    }
};

const addTenantPaymentEntry = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.tenant_id);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant id is required",
            });
        }

        const tenant = await getTenantByIdWithPayments(tenantId);

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: "Tenant not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(tenant.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this tenant",
            });
        }

        const paymentProofFile = buildUploadedFileObject(req.files?.payment_proof?.[0]);

        const payment = await createTenantPayment({
            tenant_id: tenantId,
            institution_id: tenant.institution_id,
            amount: normalizeNumber(req.body.amount),
            payment_type: normalizeText(req.body.payment_type) || "rent",
            payment_mode: normalizeText(req.body.payment_mode),
            payment_date: normalizeText(req.body.payment_date),
            reference_number: normalizeText(req.body.reference_number),
            payment_proof_url: paymentProofFile?.file_url || normalizeText(req.body.payment_proof_url),
            verification_status: ensureEnumValue(
                req.body.verification_status,
                PAYMENT_VERIFICATION_STATUSES,
                "pending"
            ),
            notes: normalizeText(req.body.notes),
            status: normalizeText(req.body.status) || "completed",
            created_by: req.user?.id || null,
        });

        return res.status(201).json({
            success: true,
            message: "Tenant payment added successfully",
            payment,
        });
    } catch (error) {
        console.error("Tenant payment create failed:", error);

        const mappedError = mapTenantError(error);

        return res.status(mappedError.statusCode).json({
            success: false,
            message: mappedError.message,
        });
    }
};

const verifyTenantPaymentEntry = async (req, res) => {
    try {
        const paymentId = normalizeInteger(req.body.payment_id);
        const tenantId = normalizeInteger(req.body.tenant_id);

        if (!paymentId || !tenantId) {
            return res.status(400).json({
                success: false,
                message: "Payment id and tenant id are required",
            });
        }

        const payment = await verifyTenantPayment({
            payment_id: paymentId,
            tenant_id: tenantId,
            verification_status: ensureEnumValue(
                req.body.verification_status,
                PAYMENT_VERIFICATION_STATUSES,
                "verified"
            ),
            verified_by: req.user?.id || null,
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tenant payment verified successfully",
            payment,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Tenant payment verification failed",
        });
    }
};

const transferTenant = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.tenant_id);
        const institutionId = resolveInstitutionId(req, req.body);
        const floorId = normalizeInteger(req.body.floor_id);
        const roomId = normalizeInteger(req.body.room_id);
        const bedId = normalizeInteger(req.body.bed_id);

        if (!tenantId || !institutionId || !floorId || !roomId || !bedId) {
            return res.status(400).json({
                success: false,
                message: "Tenant, institution, floor, room and bed are required",
            });
        }

        const tenant = await transferTenantBed({
            tenant_id: tenantId,
            institution_id: institutionId,
            floor_id: floorId,
            room_id: roomId,
            bed_id: bedId,
            transfer_reason: normalizeText(req.body.transfer_reason),
            transferred_by: req.user?.id || null,
        });

        return res.status(200).json({
            success: true,
            message: "Tenant transfer completed successfully",
            tenant,
        });
    } catch (error) {
        const mappedError = mapTenantError(error);

        return res.status(mappedError.statusCode).json({
            success: false,
            message: mappedError.message,
        });
    }
};

const vacateTenant = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.tenant_id);
        const institutionId = resolveInstitutionId(req, req.body);

        if (!tenantId || !institutionId) {
            return res.status(400).json({
                success: false,
                message: "Tenant and institution are required",
            });
        }

        const tenant = await vacateTenantStay({
            tenant_id: tenantId,
            institution_id: institutionId,
            checkout_date: normalizeText(req.body.checkout_date),
            damage_charges: normalizeNumber(req.body.damage_charges),
            refundable_amount: normalizeNumber(req.body.refundable_amount),
            deposit_refund_status: ensureEnumValue(
                req.body.deposit_refund_status,
                DEPOSIT_REFUND_STATUSES,
                "pending"
            ),
            notes: normalizeText(req.body.notes),
            performed_by: req.user?.id || null,
        });

        return res.status(200).json({
            success: true,
            message: "Tenant vacated successfully",
            tenant,
        });
    } catch (error) {
        const mappedError = mapTenantError(error);

        return res.status(mappedError.statusCode).json({
            success: false,
            message: mappedError.message,
        });
    }
};

const deleteTenant = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.id);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant id is required",
            });
        }

        const existingTenant = await getTenantByIdWithPayments(tenantId);

        if (!existingTenant) {
            return res.status(404).json({
                success: false,
                message: "Tenant not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(existingTenant.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this tenant",
            });
        }

        const tenant = await deleteTenantById(tenantId, req.user?.id || null);

        return res.status(200).json({
            success: true,
            message: "Tenant deleted successfully",
            tenant,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Tenant delete failed",
        });
    }
};

const getBedDetails = async (req, res) => {
    try {
        const bedId = normalizeInteger(req.body.bed_id);

        if (!bedId) {
            return res.status(400).json({
                success: false,
                message: "Bed id is required",
            });
        }

        const bed = await findBedWithHierarchyById(bedId);

        if (!bed) {
            return res.status(404).json({
                success: false,
                message: "Bed not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(bed.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this bed",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Bed fetched successfully",
            bed,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Bed fetch failed",
        });
    }
};

const listTenantActivity = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.tenant_id);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant id is required",
            });
        }

        const activity_logs = await getTenantActivityLogs(tenantId);

        return res.status(200).json({
            success: true,
            message: "Tenant activity fetched successfully",
            activity_logs,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Tenant activity fetch failed",
        });
    }
};

const getTenantStats = async (req, res) => {
    try {
        const stats = await getTenantDashboardStats(
            isPgAdminRequest(req) ? req.pgAdmin.institution_id : normalizeInteger(req.body.institution_id)
        );

        return res.status(200).json({
            success: true,
            message: "Tenant dashboard stats fetched successfully",
            stats,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Tenant dashboard stats fetch failed",
        });
    }
};

module.exports = {
    addTenant,
    addTenantPaymentEntry,
    deleteTenant,
    editTenant,
    getBedDetails,
    getTenantStats,
    listActiveTenants,
    listTenantActivity,
    listTenantPayments,
    listVacantBeds,
    listVacatedTenants,
    transferTenant,
    vacateTenant,
    verifyTenantPaymentEntry,
    viewTenant,
};
