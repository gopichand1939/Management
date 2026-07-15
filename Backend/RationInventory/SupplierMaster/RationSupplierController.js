const RationSupplierModel = require("./RationSupplierModel");

const createRationSupplier = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const pgAdminId = req.user?.pg_admin_id;
    const createdBy = req.user?.id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const {
            supplier_name,
            supplier_code,
            contact_person,
            phone,
            alternate_phone,
            email,
            gst_number,
            pan_number,
            address,
            city,
            state,
            pincode,
            payment_terms,
            description,
            status = "active",
        } = req.body;

        // Required field validation
        if (!supplier_name || !supplier_name.trim()) {
            return res.status(400).json({ success: false, message: "Supplier name is required" });
        }
        if (!supplier_code || !supplier_code.trim()) {
            return res.status(400).json({ success: false, message: "Supplier code is required" });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }
        if (status !== "active" && status !== "inactive") {
            return res.status(400).json({ success: false, message: "Status must be 'active' or 'inactive'" });
        }

        // Email validation
        if (email && email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return res.status(400).json({ success: false, message: "Invalid email format" });
            }
        }

        const trimmedName = supplier_name.trim();
        const trimmedCode = supplier_code.trim();
        const trimmedPhone = phone.trim();
        const trimmedEmail = email ? email.trim() : null;
        const trimmedGst = gst_number ? gst_number.trim() : null;
        const trimmedPincode = pincode ? pincode.trim() : null;

        // Duplicate validations within institution
        const dupName = await RationSupplierModel.findRationSupplierByName(trimmedName, institutionId);
        if (dupName) {
            return res.status(409).json({ success: false, message: "Supplier name already exists" });
        }

        const dupCode = await RationSupplierModel.findRationSupplierByCode(trimmedCode, institutionId);
        if (dupCode) {
            return res.status(409).json({ success: false, message: "Supplier code already exists" });
        }

        const dupPhone = await RationSupplierModel.findRationSupplierByPhone(trimmedPhone, institutionId);
        if (dupPhone) {
            return res.status(409).json({ success: false, message: "Phone number already exists" });
        }

        if (trimmedEmail) {
            const dupEmail = await RationSupplierModel.findRationSupplierByEmail(trimmedEmail, institutionId);
            if (dupEmail) {
                return res.status(409).json({ success: false, message: "Email already exists" });
            }
        }

        if (trimmedGst) {
            const dupGst = await RationSupplierModel.findRationSupplierByGstNumber(trimmedGst, institutionId);
            if (dupGst) {
                return res.status(409).json({ success: false, message: "GST number already exists" });
            }
        }

        const supplier = await RationSupplierModel.createRationSupplier(
            institutionId,
            pgAdminId,
            trimmedName,
            trimmedCode,
            contact_person ? contact_person.trim() : null,
            trimmedPhone,
            alternate_phone ? alternate_phone.trim() : null,
            trimmedEmail,
            trimmedGst,
            pan_number ? pan_number.trim() : null,
            address ? address.trim() : null,
            city ? city.trim() : null,
            state ? state.trim() : null,
            trimmedPincode,
            payment_terms ? payment_terms.trim() : null,
            description ? description.trim() : null,
            status,
            createdBy
        );

        return res.status(201).json({
            success: true,
            message: "Ration supplier created successfully",
            data: supplier,
        });
    } catch (error) {
        console.error("Error creating ration supplier:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationSupplierList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const offset = (page - 1) * limit;

        const { search = "", status = "" } = req.body;

        const suppliers = await RationSupplierModel.getRationSupplierList(
            institutionId,
            limit,
            offset,
            search,
            status
        );

        const totalCount = await RationSupplierModel.getRationSupplierCount(
            institutionId,
            search,
            status
        );

        return res.status(200).json({
            success: true,
            message: "Ration supplier list fetched successfully",
            data: suppliers,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching ration supplier list:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationSupplierById = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Supplier ID is required",
            });
        }

        const supplier = await RationSupplierModel.getRationSupplierById(id, institutionId);

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Ration supplier not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Ration supplier fetched successfully",
            data: supplier,
        });
    } catch (error) {
        console.error("Error fetching ration supplier:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const updateRationSupplier = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const updatedBy = req.user?.id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Supplier ID is required",
            });
        }

        const {
            supplier_name,
            supplier_code,
            contact_person,
            phone,
            alternate_phone,
            email,
            gst_number,
            pan_number,
            address,
            city,
            state,
            pincode,
            payment_terms,
            description,
            status = "active",
        } = req.body;

        // Required field validation
        if (!supplier_name || !supplier_name.trim()) {
            return res.status(400).json({ success: false, message: "Supplier name is required" });
        }
        if (!supplier_code || !supplier_code.trim()) {
            return res.status(400).json({ success: false, message: "Supplier code is required" });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }
        if (status !== "active" && status !== "inactive") {
            return res.status(400).json({ success: false, message: "Status must be 'active' or 'inactive'" });
        }

        // Email validation
        if (email && email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return res.status(400).json({ success: false, message: "Invalid email format" });
            }
        }

        const existingSupplier = await RationSupplierModel.getRationSupplierById(id, institutionId);
        if (!existingSupplier) {
            return res.status(404).json({ success: false, message: "Ration supplier not found" });
        }

        const trimmedName = supplier_name.trim();
        const trimmedCode = supplier_code.trim();
        const trimmedPhone = phone.trim();
        const trimmedEmail = email ? email.trim() : null;
        const trimmedGst = gst_number ? gst_number.trim() : null;
        const trimmedPincode = pincode ? pincode.trim() : null;

        // Duplicate validations within institution (excluding current ID)
        const dupName = await RationSupplierModel.findRationSupplierByName(trimmedName, institutionId);
        if (dupName && Number(dupName.id) !== Number(id)) {
            return res.status(409).json({ success: false, message: "Supplier name already exists" });
        }

        const dupCode = await RationSupplierModel.findRationSupplierByCode(trimmedCode, institutionId);
        if (dupCode && Number(dupCode.id) !== Number(id)) {
            return res.status(409).json({ success: false, message: "Supplier code already exists" });
        }

        const dupPhone = await RationSupplierModel.findRationSupplierByPhone(trimmedPhone, institutionId);
        if (dupPhone && Number(dupPhone.id) !== Number(id)) {
            return res.status(409).json({ success: false, message: "Phone number already exists" });
        }

        if (trimmedEmail) {
            const dupEmail = await RationSupplierModel.findRationSupplierByEmail(trimmedEmail, institutionId);
            if (dupEmail && Number(dupEmail.id) !== Number(id)) {
                return res.status(409).json({ success: false, message: "Email already exists" });
            }
        }

        if (trimmedGst) {
            const dupGst = await RationSupplierModel.findRationSupplierByGstNumber(trimmedGst, institutionId);
            if (dupGst && Number(dupGst.id) !== Number(id)) {
                return res.status(409).json({ success: false, message: "GST number already exists" });
            }
        }

        const updatedSupplier = await RationSupplierModel.updateRationSupplier(
            id,
            institutionId,
            trimmedName,
            trimmedCode,
            contact_person ? contact_person.trim() : null,
            trimmedPhone,
            alternate_phone ? alternate_phone.trim() : null,
            trimmedEmail,
            trimmedGst,
            pan_number ? pan_number.trim() : null,
            address ? address.trim() : null,
            city ? city.trim() : null,
            state ? state.trim() : null,
            trimmedPincode,
            payment_terms ? payment_terms.trim() : null,
            description ? description.trim() : null,
            status,
            updatedBy
        );

        return res.status(200).json({
            success: true,
            message: "Ration supplier updated successfully",
            data: updatedSupplier,
        });
    } catch (error) {
        console.error("Error updating ration supplier:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const deleteRationSupplier = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Supplier ID is required",
            });
        }

        const existingSupplier = await RationSupplierModel.getRationSupplierById(id, institutionId);
        if (!existingSupplier) {
            return res.status(404).json({
                success: false,
                message: "Ration supplier not found",
            });
        }

        const deletedSupplier = await RationSupplierModel.deleteRationSupplier(id, institutionId);

        return res.status(200).json({
            success: true,
            message: "Ration supplier deleted successfully",
            data: deletedSupplier,
        });
    } catch (error) {
        console.error("Error deleting ration supplier:", error);
        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "Supplier cannot be deleted because it is used in purchase records.",
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

const getRationSupplierDropdownList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized - Institution ID not found",
        });
    }

    try {
        const list = await RationSupplierModel.getRationSupplierDropdownList(institutionId);
        return res.status(200).json({
            success: true,
            message: "Ration supplier dropdown fetched successfully",
            data: list,
            suppliers: list, // Return in both formats requested
        });
    } catch (error) {
        console.error("Error fetching ration supplier dropdown:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error",
        });
    }
};

module.exports = {
    createRationSupplier,
    getRationSupplierList,
    getRationSupplierById,
    updateRationSupplier,
    deleteRationSupplier,
    getRationSupplierDropdownList,
};
