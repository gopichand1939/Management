const KitchenRequestModel = require("./KitchenRequestModel");

const sendResponse = (res, statusCode, success, message, data = null, pagination = null, meta = null) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        pagination,
        meta,
        timestamp: new Date().toISOString()
    });
};

const resolveInstitutionId = async (req) => {
    let institutionId = req.user?.institution_id;
    if ((req.user?.profile_id === 1 || req.user?.role === "super_admin") && req.body.institution_id) {
        institutionId = Number(req.body.institution_id);
    }
    return institutionId;
};

const getNextRequestNumber = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const nextNum = await KitchenRequestModel.getNextRequestNumber(institutionId);
        return sendResponse(res, 200, true, "Next request number generated successfully", { request_number: nextNum });
    } catch (error) {
        console.error("Error generating request number:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const createKitchenRequest = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const {
            request_date,
            required_date,
            meal_type_id,
            priority = "medium",
            remarks,
            status = "draft",
            items = []
        } = req.body;

        if (!request_date) return sendResponse(res, 400, false, "Request date is required");
        if (!required_date) return sendResponse(res, 400, false, "Required date is required");
        if (!meal_type_id) return sendResponse(res, 400, false, "Meal Type is required");
        if (!Array.isArray(items) || items.length === 0) {
            return sendResponse(res, 400, false, "At least one item is required in the request");
        }

        const requestData = {
            institution_id: institutionId,
            pg_admin_id: req.user?.pg_admin_id || null,
            request_date,
            required_date,
            meal_type_id: Number(meal_type_id),
            priority,
            remarks,
            status
        };

        const result = await KitchenRequestModel.createKitchenRequest(
            requestData,
            items,
            req.user?.credential_id || req.user?.id
        );

        return sendResponse(res, 201, true, `Kitchen request created successfully as ${status}`, result);
    } catch (error) {
        console.error("Error creating kitchen request:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const updateKitchenRequest = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { id } = req.body;
        if (!id) {
            return sendResponse(res, 400, false, "Request ID is required for updating");
        }

        const {
            request_date,
            required_date,
            meal_type_id,
            priority = "medium",
            remarks,
            status,
            items = []
        } = req.body;

        if (!request_date) return sendResponse(res, 400, false, "Request date is required");
        if (!required_date) return sendResponse(res, 400, false, "Required date is required");
        if (!meal_type_id) return sendResponse(res, 400, false, "Meal Type is required");
        if (!Array.isArray(items) || items.length === 0) {
            return sendResponse(res, 400, false, "At least one item is required in the request");
        }

        const requestData = {
            institution_id: institutionId,
            request_date,
            required_date,
            meal_type_id: Number(meal_type_id),
            priority,
            remarks,
            status
        };

        await KitchenRequestModel.updateKitchenRequest(
            Number(id),
            requestData,
            items,
            req.user?.credential_id || req.user?.id
        );

        return sendResponse(res, 200, true, "Kitchen request updated successfully", { id });
    } catch (error) {
        console.error("Error updating kitchen request:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const getKitchenRequestList = async (req, res) => {
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
            filters = {}
        } = req.body;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await KitchenRequestModel.getKitchenRequestList(
            institutionId,
            limitNum,
            offset,
            search,
            status,
            filters
        );

        const total = await KitchenRequestModel.getKitchenRequestCount(
            institutionId,
            search,
            status,
            filters
        );

        return sendResponse(res, 200, true, "Kitchen requests list fetched successfully", list, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 1
        });
    } catch (error) {
        console.error("Error fetching kitchen requests:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getKitchenRequestById = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return sendResponse(res, 400, false, "Request ID is required");
        }

        let institutionId = await resolveInstitutionId(req);
        if (!institutionId && (req.user?.role === "super_admin" || req.user?.profile_id === 1)) {
            // Retrieve institution ID from db if needed
            institutionId = await KitchenRequestModel.getInstitutionIdByRequestId(id);
        }

        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const details = await KitchenRequestModel.getKitchenRequestById(Number(id), institutionId);
        if (!details) {
            return sendResponse(res, 404, false, "Kitchen request not found");
        }

        return sendResponse(res, 200, true, "Kitchen request fetched successfully", details);
    } catch (error) {
        console.error("Error fetching kitchen request details:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const deleteKitchenRequest = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { id } = req.body;
        if (!id) {
            return sendResponse(res, 400, false, "Request ID is required");
        }

        const deleted = await KitchenRequestModel.deleteKitchenRequest(Number(id), institutionId);
        if (!deleted) {
            return sendResponse(res, 404, false, "Kitchen request not found or not in draft/pending status");
        }

        return sendResponse(res, 200, true, "Kitchen request deleted successfully");
    } catch (error) {
        console.error("Error deleting kitchen request:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const approveKitchenRequest = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { id, items = [] } = req.body;
        if (!id) {
            return sendResponse(res, 400, false, "Request ID is required");
        }
        if (!Array.isArray(items) || items.length === 0) {
            return sendResponse(res, 400, false, "At least one item approved quantity must be specified");
        }

        await KitchenRequestModel.approveKitchenRequest(
            Number(id),
            institutionId,
            items,
            req.user?.credential_id || req.user?.id
        );

        return sendResponse(res, 200, true, "Kitchen request approved successfully");
    } catch (error) {
        console.error("Error approving kitchen request:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const rejectKitchenRequest = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { id, remarks } = req.body;
        if (!id) {
            return sendResponse(res, 400, false, "Request ID is required");
        }

        await KitchenRequestModel.rejectKitchenRequest(
            Number(id),
            institutionId,
            remarks,
            req.user?.credential_id || req.user?.id
        );

        return sendResponse(res, 200, true, "Kitchen request rejected successfully");
    } catch (error) {
        console.error("Error rejecting kitchen request:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const getKitchenRequestSummary = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const summary = await KitchenRequestModel.getKitchenRequestSummary(institutionId);
        return sendResponse(res, 200, true, "Kitchen requests summary fetched successfully", summary);
    } catch (error) {
        console.error("Error fetching kitchen request summary:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

module.exports = {
    getNextRequestNumber,
    createKitchenRequest,
    updateKitchenRequest,
    getKitchenRequestList,
    getKitchenRequestById,
    deleteKitchenRequest,
    approveKitchenRequest,
    rejectKitchenRequest,
    getKitchenRequestSummary
};
