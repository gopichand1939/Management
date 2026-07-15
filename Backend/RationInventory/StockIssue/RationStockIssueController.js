const RationStockIssueModel = require("./RationStockIssueModel");
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

const getNextStockIssueNumber = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const nextNum = await RationStockIssueModel.getNextStockIssueNumber(institutionId);
        return sendResponse(res, 200, true, "Next stock issue number generated successfully", { issue_number: nextNum });
    } catch (error) {
        console.error("Error generating next stock issue number:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getApprovedKitchenRequestList = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { page = 1, limit = 10, search = "" } = req.body;
        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await RationStockIssueModel.getApprovedRequestList(institutionId, limitNum, offset, search);
        const total = await RationStockIssueModel.getApprovedRequestCount(institutionId, search);

        return sendResponse(res, 200, true, "Approved kitchen requests list fetched successfully", list, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 0
        });
    } catch (error) {
        console.error("Error fetching approved kitchen requests list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getApprovedKitchenRequestById = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id || req.body.request_id || req.body.kitchen_request_id;
        if (!id) {
            return sendResponse(res, 400, false, "Kitchen request ID is required");
        }

        const header = await RationStockIssueModel.getApprovedRequestById(Number(id), institutionId);
        if (!header) {
            return sendResponse(res, 404, false, "Approved kitchen request not found");
        }

        const items = await RationStockIssueModel.getApprovedRequestItems(Number(id), institutionId);

        return sendResponse(res, 200, true, "Approved kitchen request details fetched successfully", {
            header,
            items
        });
    } catch (error) {
        console.error("Error fetching approved kitchen request details:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const createRationStockIssue = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const pgAdminId = req.user?.pg_admin_id || null;
        const createdBy = req.user?.id;

        const {
            kitchen_request_id,
            issue_date,
            remarks,
            items = []
        } = req.body;

        if (!kitchen_request_id) {
            return sendResponse(res, 400, false, "Kitchen request ID is required");
        }
        if (!issue_date) {
            return sendResponse(res, 400, false, "Issue date is required");
        }
        if (!Array.isArray(items) || items.length === 0) {
            return sendResponse(res, 400, false, "At least one item is required for issuing stock");
        }

        const result = await RationStockIssueModel.createRationStockIssueTransaction(institutionId, pgAdminId, createdBy, {
            kitchen_request_id,
            issue_date,
            remarks
        }, items);

        return sendResponse(res, 201, true, "Stock issued successfully", result);
    } catch (error) {
        console.error("Error in createRationStockIssue controller:", error);
        return sendResponse(res, 400, false, error.message || "Failed to create stock issue");
    }
};

const getRationStockIssueList = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { page = 1, limit = 10, search = "", status = "" } = req.body;
        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await RationStockIssueModel.getStockIssueList(institutionId, limitNum, offset, search, status);
        const total = await RationStockIssueModel.getStockIssueCount(institutionId, search, status);

        return sendResponse(res, 200, true, "Stock issues list fetched successfully", list, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 0
        });
    } catch (error) {
        console.error("Error fetching stock issues list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationStockIssueById = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Stock issue ID is required");
        }

        const header = await RationStockIssueModel.getStockIssueById(Number(id), institutionId);
        if (!header) {
            return sendResponse(res, 404, false, "Stock issue details not found");
        }

        const items = await RationStockIssueModel.getStockIssueItems(Number(id), institutionId);

        return sendResponse(res, 200, true, "Stock issue details fetched successfully", {
            header,
            items
        });
    } catch (error) {
        console.error("Error fetching stock issue details:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const cancelRationStockIssue = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const createdBy = req.user?.id;
        const { id } = req.body;

        if (!id) {
            return sendResponse(res, 400, false, "Stock issue ID is required for cancellation");
        }

        await RationStockIssueModel.cancelRationStockIssueTransaction(Number(id), institutionId, createdBy);

        return sendResponse(res, 200, true, "Stock issue cancelled successfully");
    } catch (error) {
        console.error("Error in cancelRationStockIssue controller:", error);
        return sendResponse(res, 400, false, error.message || "Failed to cancel stock issue");
    }
};

module.exports = {
    getNextStockIssueNumber,
    getApprovedKitchenRequestList,
    getApprovedKitchenRequestById,
    createRationStockIssue,
    getRationStockIssueList,
    getRationStockIssueById,
    cancelRationStockIssue
};
