const RationStockAdjustmentModel = require("./RationStockAdjustmentModel");
const pool = require("../../Config/Database");

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

const getNextAdjustmentNumber = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const nextNum = await RationStockAdjustmentModel.getNextAdjustmentNumber(institutionId);
        return sendResponse(res, 200, true, "Next stock adjustment number generated successfully", { adjustment_number: nextNum });
    } catch (error) {
        console.error("Error generating stock adjustment number:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const createRationStockAdjustment = async (req, res) => {
    const client = await pool.connect();
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

        await client.query("BEGIN");

        // Generate next sequence number
        const adjNumber = await RationStockAdjustmentModel.getNextAdjustmentNumber(institutionId, client);

        // Insert Header
        const adjHeader = await RationStockAdjustmentModel.createStockAdjustment({
            institution_id: institutionId,
            adjustment_number: adjNumber,
            adjustment_date,
            reason,
            remarks,
            status: "completed",
            created_by: createdBy
        }, client);

        const stockAdjustmentId = adjHeader.id;

        // Process items
        for (const item of items) {
            const itemId = Number(item.item_id);
            const adjQty = parseFloat(item.adjustment_quantity);
            const direction = item.adjustment_direction; // "increase" or "decrease"
            const itemRemarks = item.remarks || null;
            const itemReason = item.reason || reason;

            if (isNaN(adjQty) || adjQty <= 0) {
                throw new Error("Adjustment quantity must be greater than zero");
            }
            if (direction !== "increase" && direction !== "decrease") {
                throw new Error("Adjustment direction must be either 'increase' or 'decrease'");
            }

            // Get dynamic current stock inside transaction
            const currentStock = await RationStockAdjustmentModel.getCurrentStockForItem(itemId, institutionId, client);

            if (direction === "decrease" && adjQty > currentStock) {
                throw new Error(`Adjustment decrease quantity (${adjQty}) cannot exceed current available stock (${currentStock}) for item ID ${itemId}`);
            }

            const previousStock = currentStock;
            const newStock = direction === "increase" ? previousStock + adjQty : previousStock - adjQty;

            // Create Adjustment Item line
            await RationStockAdjustmentModel.createStockAdjustmentItem({
                stock_adjustment_id: stockAdjustmentId,
                institution_id: institutionId,
                item_id: itemId,
                current_stock: currentStock,
                adjustment_quantity: adjQty,
                adjustment_direction: direction,
                previous_stock: previousStock,
                new_stock: newStock,
                reason: itemReason,
                remarks: itemRemarks
            }, client);

            // Create Transaction
            await RationStockAdjustmentModel.createStockTransaction({
                institution_id: institutionId,
                item_id: itemId,
                transaction_type: "ADJUSTMENT",
                reference_type: "ADJUSTMENT",
                reference_id: stockAdjustmentId,
                reference_number: adjNumber,
                quantity_in: direction === "increase" ? adjQty : 0,
                quantity_out: direction === "decrease" ? adjQty : 0,
                batch_number: null,
                expiry_date: null,
                unit_price: 0,
                remarks: itemRemarks || remarks,
                created_by: createdBy
            }, client);
        }

        await client.query("COMMIT");
        return sendResponse(res, 201, true, "Stock adjustment created successfully", {
            id: stockAdjustmentId,
            adjustment_number: adjNumber
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error creating stock adjustment:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    } finally {
        client.release();
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
            return sendResponse(res, 404, false, "Stock adjustment not found");
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
    const client = await pool.connect();
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

        await client.query("BEGIN");

        // Fetch and lock header
        const selectQuery = `
            SELECT id, adjustment_number, status 
            FROM ration_stock_adjustments 
            WHERE id = $1 AND institution_id = $2 
            FOR UPDATE
        `;
        const selectRes = await client.query(selectQuery, [Number(id), institutionId]);
        if (selectRes.rows.length === 0) {
            throw new Error("Stock adjustment not found or unauthorized");
        }

        const adjustment = selectRes.rows[0];
        if (adjustment.status !== "completed") {
            throw new Error(`Only completed stock adjustments can be cancelled. Current status is '${adjustment.status}'.`);
        }

        // Fetch item lines to create offset transactions
        const items = await RationStockAdjustmentModel.getAdjustmentItems(Number(id), institutionId, client);

        // Perform reversals
        for (const item of items) {
            const itemId = Number(item.item_id);
            const adjQty = parseFloat(item.adjustment_quantity);
            const direction = item.adjustment_direction;

            // Recalculate dynamic stock balance before cancellation to check decrease offsets
            const currentStock = await RationStockAdjustmentModel.getCurrentStockForItem(itemId, institutionId, client);

            // If the original adjustment was an INCREASE, cancelling it acts as a DECREASE of stock.
            // Check if there is enough stock remaining to reverse the increase.
            if (direction === "increase" && adjQty > currentStock) {
                throw new Error(`Cannot cancel stock adjustment. Reversal requires subtracting ${adjQty} units of ${item.item_name}, but current available stock is only ${currentStock}.`);
            }

            // Insert reversal transaction: flip quantity_in and quantity_out
            await RationStockAdjustmentModel.createStockTransaction({
                institution_id: institutionId,
                item_id: itemId,
                transaction_type: "ADJUSTMENT",
                reference_type: "ADJUSTMENT_CANCEL",
                reference_id: Number(id),
                reference_number: adjustment.adjustment_number,
                quantity_in: direction === "decrease" ? adjQty : 0,  // Decreased stock is returned
                quantity_out: direction === "increase" ? adjQty : 0, // Increased stock is removed
                batch_number: null,
                expiry_date: null,
                unit_price: 0,
                remarks: `Cancellation offset for Stock Adjustment ${adjustment.adjustment_number}`,
                created_by: createdBy
            }, client);
        }

        // Update adjustment status
        await RationStockAdjustmentModel.cancelStockAdjustment(Number(id), institutionId, client);

        await client.query("COMMIT");
        return sendResponse(res, 200, true, "Stock adjustment cancelled successfully");

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error cancelling stock adjustment:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    } finally {
        client.release();
    }
};

module.exports = {
    getNextAdjustmentNumber,
    createRationStockAdjustment,
    getRationStockAdjustmentList,
    getRationStockAdjustmentById,
    cancelRationStockAdjustment
};
