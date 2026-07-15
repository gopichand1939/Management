const RationStockAuditModel = require("./RationStockAuditModel");
const RationStockAdjustmentModel = require("../StockAdjustment/RationStockAdjustmentModel");
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
    const client = await pool.connect();
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

        await client.query("BEGIN");

        const auditNumber = await RationStockAuditModel.getNextAuditNumber(institutionId, client);

        const auditHeader = await RationStockAuditModel.createStockAudit({
            institution_id: institutionId,
            audit_number: auditNumber,
            audit_date,
            audit_name,
            remarks,
            status,
            created_by: createdBy
        }, client);

        const auditId = auditHeader.id;

        for (const item of items) {
            const itemId = Number(item.item_id);
            const sysStock = parseFloat(item.system_stock);
            const pStock = parseFloat(item.physical_stock);
            const diff = pStock - sysStock;

            let direction = null;
            if (diff > 0) {
                direction = "increase";
            } else if (diff < 0) {
                direction = "decrease";
            }

            await RationStockAuditModel.createStockAuditItem({
                audit_id: auditId,
                institution_id: institutionId,
                item_id: itemId,
                system_stock: sysStock,
                physical_stock: pStock,
                difference_quantity: diff,
                adjustment_direction: direction,
                remarks: item.remarks || null
            }, client);
        }

        await client.query("COMMIT");
        return sendResponse(res, 201, true, `Stock audit created successfully as ${status}`, {
            id: auditId,
            audit_number: auditNumber
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error creating stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    } finally {
        client.release();
    }
};

const updateStockAudit = async (req, res) => {
    const client = await pool.connect();
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

        await client.query("BEGIN");

        // Fetch and lock header
        const auditRes = await client.query(
            `SELECT id, status FROM ration_stock_audits WHERE id = $1 AND institution_id = $2 FOR UPDATE`,
            [Number(id), institutionId]
        );
        if (auditRes.rows.length === 0) {
            throw new Error("Stock audit not found or unauthorized");
        }

        const existingAudit = auditRes.rows[0];
        if (existingAudit.status !== 'draft') {
            throw new Error(`Only draft stock audits can be edited. Current status is '${existingAudit.status}'`);
        }

        // Validate items
        const itemIds = new Set();
        for (const item of items) {
            const pStock = parseFloat(item.physical_stock);
            if (isNaN(pStock) || pStock < 0) {
                throw new Error(`Physical stock for item ID ${item.item_id} cannot be negative`);
            }
            if (itemIds.has(item.item_id)) {
                throw new Error(`Duplicate item ID ${item.item_id} found in audit list`);
            }
            itemIds.add(item.item_id);
        }

        // Update header
        await RationStockAuditModel.updateStockAudit(Number(id), {
            institution_id: institutionId,
            audit_date,
            audit_name,
            remarks,
            status
        }, client);

        // Clear existing item lines
        await RationStockAuditModel.deleteStockAuditItems(Number(id), client);

        // Insert new item lines
        for (const item of items) {
            const itemId = Number(item.item_id);
            const sysStock = parseFloat(item.system_stock);
            const pStock = parseFloat(item.physical_stock);
            const diff = pStock - sysStock;

            let direction = null;
            if (diff > 0) {
                direction = "increase";
            } else if (diff < 0) {
                direction = "decrease";
            }

            await RationStockAuditModel.createStockAuditItem({
                audit_id: Number(id),
                institution_id: institutionId,
                item_id: itemId,
                system_stock: sysStock,
                physical_stock: pStock,
                difference_quantity: diff,
                adjustment_direction: direction,
                remarks: item.remarks || null
            }, client);
        }

        await client.query("COMMIT");
        return sendResponse(res, 200, true, "Stock audit updated successfully");

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error updating stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    } finally {
        client.release();
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

        // Fetch existing status
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
    const client = await pool.connect();
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

        await client.query("BEGIN");

        // Lock and load Audit Header
        const selectQuery = `
            SELECT id, audit_number, audit_date, remarks, status 
            FROM ration_stock_audits 
            WHERE id = $1 AND institution_id = $2 
            FOR UPDATE
        `;
        const selectRes = await client.query(selectQuery, [Number(id), institutionId]);
        if (selectRes.rows.length === 0) {
            throw new Error("Stock audit not found or unauthorized");
        }

        const audit = selectRes.rows[0];
        if (audit.status !== "pending") {
            throw new Error(`Only audits in pending status can be approved. Current status: '${audit.status}'`);
        }

        // Fetch audit item lines
        const items = await RationStockAuditModel.getAuditItems(Number(id), institutionId, client);
        const differenceItems = items.filter(item => parseFloat(item.difference_quantity) !== 0);

        if (differenceItems.length > 0) {
            // Generate next stock adjustment sequential number
            const adjNumber = await RationStockAdjustmentModel.getNextAdjustmentNumber(institutionId, client);

            // Create Stock Adjustment Header
            const adjHeader = await RationStockAdjustmentModel.createStockAdjustment({
                institution_id: institutionId,
                adjustment_number: adjNumber,
                adjustment_date: audit.audit_date,
                reason: "Correction",
                remarks: `Correction generated automatically from approved Stock Audit ${audit.audit_number}. ${audit.remarks || ""}`.trim(),
                status: "completed",
                created_by: approvedBy,
                approved_by: approvedBy
            }, client);

            const adjustmentId = adjHeader.id;

            // Generate adjustment lines & stock transaction logs for difference rows
            for (const item of differenceItems) {
                const itemId = Number(item.item_id);
                const diffQty = parseFloat(item.difference_quantity);
                const direction = item.adjustment_direction; // "increase" or "decrease"
                const adjQty = Math.abs(diffQty);

                // Fetch current stock inside transaction
                const currentStock = await RationStockAdjustmentModel.getCurrentStockForItem(itemId, institutionId, client);

                if (direction === "decrease" && adjQty > currentStock) {
                    throw new Error(`Cannot approve stock audit. Reversal requires decreasing ${adjQty} units of ${item.item_name}, but current available stock is only ${currentStock}.`);
                }

                const previousStock = currentStock;
                const newStock = direction === "increase" ? previousStock + adjQty : previousStock - adjQty;

                // Create adjustment item row
                await RationStockAdjustmentModel.createStockAdjustmentItem({
                    stock_adjustment_id: adjustmentId,
                    institution_id: institutionId,
                    item_id: itemId,
                    current_stock: currentStock,
                    adjustment_quantity: adjQty,
                    adjustment_direction: direction,
                    previous_stock: previousStock,
                    new_stock: newStock,
                    reason: "Correction",
                    remarks: `Audit diff adjustment for ${item.item_name}. ${item.remarks || ""}`.trim()
                }, client);

                // Create transaction history row
                await RationStockAdjustmentModel.createStockTransaction({
                    institution_id: institutionId,
                    item_id: itemId,
                    transaction_type: "ADJUSTMENT",
                    reference_type: "ADJUSTMENT",
                    reference_id: adjustmentId,
                    reference_number: adjNumber,
                    quantity_in: direction === "increase" ? adjQty : 0,
                    quantity_out: direction === "decrease" ? adjQty : 0,
                    batch_number: null,
                    expiry_date: null,
                    unit_price: 0,
                    remarks: `Audit correction transaction for ${item.item_name}`,
                    created_by: approvedBy
                }, client);
            }
        }

        // Set status to approved (which updates approved details)
        await RationStockAuditModel.updateAuditStatus(Number(id), institutionId, "approved", approvedBy, client);

        await client.query("COMMIT");
        return sendResponse(res, 200, true, "Stock audit approved and stock adjustments applied successfully");

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error approving stock audit:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    } finally {
        client.release();
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
