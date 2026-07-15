const RationStockAuditModel = require("./RationStockAuditModel");

const resolveInstitutionId = async (req) => {
    let institutionId = req.user?.institution_id;
    if ((req.user?.profile_id === 1 || req.user?.role === "super_admin") && req.body.institution_id) {
        institutionId = Number(req.body.institution_id);
    }
    return institutionId;
};

const sendResponse = (res, statusCode, success, message, data = null, pagination = null) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        pagination,
        timestamp: new Date().toISOString()
    });
};

const getNextAuditNumber = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const nextNum = await RationStockAuditModel.getNextAuditNumber(institutionId);
        return sendResponse(res, 200, true, "Next stock audit number generated successfully", { audit_number: nextNum });
    } catch (error) {
        console.error("Error generating stock audit number:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const createStockAudit = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const createdBy = req.user?.id;

        const {
            audit_date,
            audit_name,
            remarks,
            status = "draft",
            items = []
        } = req.body;

        if (!audit_date) {
            return sendResponse(res, 400, false, "Audit date is required");
        }
        if (!audit_name) {
            return sendResponse(res, 400, false, "Audit name is required");
        }
        if (!Array.isArray(items) || items.length === 0) {
            return sendResponse(res, 400, false, "At least one item is required for stock audit");
        }

        // Validate physical stock cannot be negative and duplicates
        const itemIds = new Set();
        for (const item of items) {
            const pStock = parseFloat(item.physical_stock);
            if (isNaN(pStock) || pStock < 0) {
                return sendResponse(res, 400, false, `Physical stock for item ID ${item.item_id} cannot be negative`);
            }
            if (itemIds.has(item.item_id)) {
                return sendResponse(res, 400, false, `Duplicate item ID ${item.item_id} found in audit list`);
            }
            itemIds.add(item.item_id);
        }

        const result = await RationStockAuditModel.createStockAuditTransaction(institutionId, {
            audit_date,
            audit_name,
            remarks,
            status
        }, items, createdBy);

        return sendResponse(res, 201, true, `Stock audit created successfully as ${status}`, result);

    } catch (error) {
        console.error("Error creating stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const updateStockAudit = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const {
            id,
            audit_date,
            audit_name,
            remarks,
            status = "draft",
            items = []
        } = req.body;

        if (!id) {
            return sendResponse(res, 400, false, "Stock audit ID is required for editing");
        }
        if (!audit_date) {
            return sendResponse(res, 400, false, "Audit date is required");
        }
        if (!audit_name) {
            return sendResponse(res, 400, false, "Audit name is required");
        }
        if (!Array.isArray(items) || items.length === 0) {
            return sendResponse(res, 400, false, "At least one item is required for stock audit");
        }

        // Validate items
        const itemIds = new Set();
        for (const item of items) {
            const pStock = parseFloat(item.physical_stock);
            if (isNaN(pStock) || pStock < 0) {
                return sendResponse(res, 400, false, `Physical stock for item ID ${item.item_id} cannot be negative`);
            }
            if (itemIds.has(item.item_id)) {
                return sendResponse(res, 400, false, `Duplicate item ID ${item.item_id} found in audit list`);
            }
            itemIds.add(item.item_id);
        }

        await RationStockAuditModel.updateStockAuditTransaction(Number(id), institutionId, {
            audit_date,
            audit_name,
            remarks,
            status
        }, items);

        return sendResponse(res, 200, true, "Stock audit updated successfully");

    } catch (error) {
        console.error("Error updating stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const deleteStockAudit = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Stock audit ID is required for deletion");
        }

        const result = await RationStockAuditModel.deleteStockAudit(Number(id), institutionId);
        if (!result) {
            return sendResponse(res, 404, false, "Stock audit not found, unauthorized, or not in draft status");
        }

        return sendResponse(res, 200, true, "Stock audit deleted successfully");
    } catch (error) {
        console.error("Error deleting stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationStockAuditList = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const {
            page = 1,
            limit = 10,
            search = "",
            status = "",
            startDate = "",
            endDate = ""
        } = req.body;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await RationStockAuditModel.getAuditList(
            institutionId,
            limitNum,
            offset,
            search,
            status,
            startDate,
            endDate
        );

        const total = await RationStockAuditModel.getAuditCount(
            institutionId,
            search,
            status,
            startDate,
            endDate
        );

        return sendResponse(res, 200, true, "Stock audits list fetched successfully", list, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 0
        });
    } catch (error) {
        console.error("Error fetching stock audits list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationStockAuditById = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Stock audit ID is required");
        }

        const header = await RationStockAuditModel.getAuditById(Number(id), institutionId);
        if (!header) {
            return sendResponse(res, 404, false, "Stock audit details not found");
        }

        const items = await RationStockAuditModel.getAuditItems(Number(id), institutionId);

        return sendResponse(res, 200, true, "Stock audit details fetched successfully", {
            header,
            items
        });
    } catch (error) {
        console.error("Error fetching stock audit details:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const rejectStockAudit = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Stock audit ID is required");
        }

        const audit = await RationStockAuditModel.getAuditById(Number(id), institutionId);
        if (!audit) {
            return sendResponse(res, 404, false, "Stock audit not found");
        }
        if (audit.status !== "pending") {
            return sendResponse(res, 400, false, `Only audits in pending status can be rejected. Current status: '${audit.status}'`);
        }

        await RationStockAuditModel.updateAuditStatus(Number(id), institutionId, "rejected", req.user?.id);
        return sendResponse(res, 200, true, "Stock audit rejected successfully");
    } catch (error) {
        console.error("Error rejecting stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const approveStockAudit = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Stock audit ID is required");
        }

        const approvedBy = req.user?.id;

        await RationStockAuditModel.approveStockAuditTransaction(Number(id), institutionId, approvedBy);

        return sendResponse(res, 200, true, "Stock audit approved and stock adjustments applied successfully");
    } catch (error) {
        console.error("Error approving stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

module.exports = {
    getNextAuditNumber,
    createStockAudit,
    updateStockAudit,
    deleteStockAudit,
    getRationStockAuditList,
    getRationStockAuditById,
    rejectStockAudit,
    approveStockAudit
};
