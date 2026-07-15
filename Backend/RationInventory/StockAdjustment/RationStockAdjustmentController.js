const RationStockAdjustmentModel = require("./RationStockAdjustmentModel");

const resolveInstitutionId = async (req) => {
    let institutionId = req.user?.institution_id;
    if ((req.user?.profile_id === 1 || req.user?.role === "super_admin") && req.body.institution_id) {
        institutionId = Number(req.body.institution_id);
    }
    return institutionId;
};

const sendResponse = (res, statusCode, success, message, data = null) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

const getNextAdjustmentNumber = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const nextNum = await RationStockAdjustmentModel.getNextAdjustmentNumber(institutionId);
        return sendResponse(res, 200, true, "Next stock adjustment number generated successfully", { adjustment_number: nextNum });
    } catch (error) {
        console.error("Error generating next stock adjustment number:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const createRationStockAdjustment = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const createdBy = req.user?.id;

        const {
            adjustment_date,
            reason,
            remarks,
            items = []
        } = req.body;

        if (!adjustment_date) {
            return sendResponse(res, 400, false, "Adjustment date is required");
        }
        if (!reason) {
            return sendResponse(res, 400, false, "Adjustment reason is required");
        }
        if (!Array.isArray(items) || items.length === 0) {
            return sendResponse(res, 400, false, "At least one item is required for stock adjustment");
        }

        const result = await RationStockAdjustmentModel.createStockAdjustmentTransaction(institutionId, createdBy, {
            adjustment_date,
            reason,
            remarks
        }, items);

        return sendResponse(res, 201, true, "Stock adjustment created successfully", result);

    } catch (error) {
        console.error("Error creating stock adjustment:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationStockAdjustmentList = async (req, res) => {
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
            reason = ""
        } = req.body;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await RationStockAdjustmentModel.getAdjustmentList(
            institutionId,
            limitNum,
            offset,
            search,
            status,
            reason
        );

        const total = await RationStockAdjustmentModel.getAdjustmentCount(
            institutionId,
            search,
            status,
            reason
        );

        return sendResponse(res, 200, true, "Stock adjustments list fetched successfully", list, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 0
        });
    } catch (error) {
        console.error("Error fetching stock adjustments list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationStockAdjustmentById = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Stock adjustment ID is required");
        }

        const header = await RationStockAdjustmentModel.getAdjustmentById(Number(id), institutionId);
        if (!header) {
            return sendResponse(res, 404, false, "Stock adjustment details not found");
        }

        const items = await RationStockAdjustmentModel.getAdjustmentItems(Number(id), institutionId);

        return sendResponse(res, 200, true, "Stock adjustment details fetched successfully", {
            header,
            items
        });
    } catch (error) {
        console.error("Error fetching stock adjustment details:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const cancelRationStockAdjustment = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const id = req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Stock adjustment ID is required");
        }

        const createdBy = req.user?.id;

        await RationStockAdjustmentModel.cancelStockAdjustmentTransaction(Number(id), institutionId, createdBy);

        return sendResponse(res, 200, true, "Stock adjustment cancelled successfully");

    } catch (error) {
        console.error("Error cancelling stock adjustment:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

module.exports = {
    getNextAdjustmentNumber,
    createRationStockAdjustment,
    getRationStockAdjustmentList,
    getRationStockAdjustmentById,
    cancelRationStockAdjustment
};
