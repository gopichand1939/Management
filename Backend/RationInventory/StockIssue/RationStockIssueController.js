const RationStockIssueModel = require("./RationStockIssueModel");
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

const getNextStockIssueNumber = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const nextNum = await RationStockIssueModel.getNextStockIssueNumber(institutionId);
        return sendResponse(res, 200, true, "Next stock issue number generated successfully", { issue_number: nextNum });
    } catch (error) {
        console.error("Error generating stock issue number:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getApprovedKitchenRequestList = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const {
            page = 1,
            limit = 10,
            search = ""
        } = req.body;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await RationStockIssueModel.getApprovedRequestList(
            institutionId,
            limitNum,
            offset,
            search
        );

        const total = await RationStockIssueModel.getApprovedRequestCount(
            institutionId,
            search
        );

        return sendResponse(res, 200, true, "Approved kitchen requests fetched successfully", list, {
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

        const id = req.body.request_id || req.body.id;
        if (!id) {
            return sendResponse(res, 400, false, "Kitchen request ID is required");
        }

        const header = await RationStockIssueModel.getApprovedRequestById(Number(id), institutionId);
        if (!header) {
            return sendResponse(res, 404, false, "Approved kitchen request not found");
        }

        if (header.status !== 'approved' && header.status !== 'partially_issued') {
            return sendResponse(res, 400, false, `Kitchen request status is ${header.status}. Only approved or partially_issued requests can be issued.`);
        }

        const items = await RationStockIssueModel.getApprovedRequestItems(Number(id), institutionId);
        if (items.length === 0) {
            return sendResponse(res, 400, false, "Approved request has no items to issue");
        }

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
    const client = await pool.connect();
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

        await client.query("BEGIN");

        // Lock and read Kitchen Request Header
        const requestHeaderQuery = `
            SELECT id, request_number, meal_type_id, status 
            FROM ration_kitchen_requests 
            WHERE id = $1 AND institution_id = $2 
            FOR UPDATE
        `;
        const reqHeaderRes = await client.query(requestHeaderQuery, [Number(kitchen_request_id), institutionId]);
        if (reqHeaderRes.rows.length === 0) {
            throw new Error("Kitchen request not found or unauthorized");
        }
        const requestHeader = reqHeaderRes.rows[0];

        if (requestHeader.status !== 'approved' && requestHeader.status !== 'partially_issued') {
            throw new Error(`Cannot issue stock for request in status '${requestHeader.status}'`);
        }

        // Lock and read Kitchen Request item rows
        const requestItemsQuery = `
            SELECT id, item_id, approved_quantity, issued_quantity 
            FROM ration_kitchen_request_items 
            WHERE request_id = $1 AND institution_id = $2 
            FOR UPDATE
        `;
        const reqItemsRes = await client.query(requestItemsQuery, [Number(kitchen_request_id), institutionId]);
        const dbRequestItems = reqItemsRes.rows;

        if (dbRequestItems.length === 0) {
            throw new Error("Approved request has no items to issue");
        }

        // Generate Stock Issue number
        const issueNumber = await RationStockIssueModel.getNextStockIssueNumber(institutionId, client);

        // Create Stock Issue Header
        const issueResult = await RationStockIssueModel.createStockIssue({
            institution_id: institutionId,
            pg_admin_id: pgAdminId,
            issue_number: issueNumber,
            kitchen_request_id: Number(kitchen_request_id),
            issue_date,
            issued_to: createdBy,
            meal_type_id: requestHeader.meal_type_id,
            remarks,
            status: 'completed',
            created_by: createdBy
        }, client);

        const stockIssueId = issueResult.id;
        const issuedItems = [];

        // Loop over items and perform validation/stock reduction
        for (const reqItem of items) {
            const dbItem = dbRequestItems.find(
                i => i.id === Number(reqItem.kitchen_request_item_id) && i.item_id === Number(reqItem.item_id)
            );
            if (!dbItem) {
                throw new Error(`Request item ID ${reqItem.kitchen_request_item_id} not found in this request`);
            }

            const approvedQty = parseFloat(dbItem.approved_quantity || 0);
            const previouslyIssuedQty = parseFloat(dbItem.issued_quantity || 0);
            const remainingQty = approvedQty - previouslyIssuedQty;
            const issueQty = parseFloat(reqItem.issue_quantity || 0);

            if (isNaN(issueQty) || issueQty <= 0) {
                throw new Error("Issue quantity must be greater than 0");
            }
            if (issueQty > remainingQty) {
                throw new Error(`Issue quantity (${issueQty}) exceeds remaining approved quantity (${remainingQty})`);
            }

            // Recalculate Current Stock inside transaction
            const currentStock = await RationStockIssueModel.getCurrentStockForItem(Number(reqItem.item_id), institutionId, client);
            if (issueQty > currentStock) {
                throw new Error(`Issue quantity (${issueQty}) exceeds available stock (${currentStock})`);
            }

            // Get item tracking configurations and default prices
            const itemQuery = `SELECT batch_tracking, expiry_tracking, default_purchase_price FROM ration_items WHERE id = $1`;
            const itemRes = await client.query(itemQuery, [Number(reqItem.item_id)]);
            const itemDetails = itemRes.rows[0];

            if (itemDetails.batch_tracking && (!reqItem.batch_number || !reqItem.batch_number.trim())) {
                throw new Error(`Batch number is required for item ID ${reqItem.item_id}`);
            }
            if (itemDetails.expiry_tracking && !reqItem.expiry_date) {
                throw new Error(`Expiry date is required for item ID ${reqItem.item_id}`);
            }

            // Create Stock Issue Item
            const issueItemResult = await RationStockIssueModel.createStockIssueItem({
                stock_issue_id: stockIssueId,
                institution_id: institutionId,
                kitchen_request_item_id: Number(reqItem.kitchen_request_item_id),
                item_id: Number(reqItem.item_id),
                approved_quantity: approvedQty,
                previously_issued_quantity: previouslyIssuedQty,
                issue_quantity: issueQty,
                unit_price: itemDetails.default_purchase_price || 0,
                batch_number: reqItem.batch_number,
                expiry_date: reqItem.expiry_date,
                remarks: reqItem.remarks
            }, client);

            // Create Stock Transaction (quantity_out = issueQty)
            await RationStockIssueModel.createStockTransaction({
                institution_id: institutionId,
                item_id: Number(reqItem.item_id),
                transaction_type: 'STOCK_ISSUE',
                reference_id: stockIssueId,
                reference_number: issueNumber,
                quantity_in: 0,
                quantity_out: issueQty,
                batch_number: reqItem.batch_number,
                expiry_date: reqItem.expiry_date,
                unit_price: itemDetails.default_purchase_price || 0,
                remarks: reqItem.remarks || remarks,
                created_by: createdBy
            }, client);

            // Update Kitchen Request Item issued_quantity
            await RationStockIssueModel.updateKitchenRequestItemIssuedQuantity(
                Number(reqItem.kitchen_request_item_id),
                issueQty,
                client
            );

            issuedItems.push({
                id: issueItemResult.id,
                item_id: reqItem.item_id,
                issue_quantity: issueQty
            });
        }

        // Re-read updated kitchen request items to calculate overall status
        const updatedItemsRes = await client.query(
            `SELECT approved_quantity, issued_quantity FROM ration_kitchen_request_items WHERE request_id = $1`,
            [Number(kitchen_request_id)]
        );
        const updatedItems = updatedItemsRes.rows;

        let allCompleted = true;
        let anyIssued = false;

        for (const uItem of updatedItems) {
            const uApproved = parseFloat(uItem.approved_quantity || 0);
            const uIssued = parseFloat(uItem.issued_quantity || 0);

            if (uIssued < uApproved) {
                allCompleted = false;
            }
            if (uIssued > 0) {
                anyIssued = true;
            }
        }

        let newStatus = 'approved';
        if (allCompleted && updatedItems.length > 0) {
            newStatus = 'completed';
        } else if (anyIssued) {
            newStatus = 'partially_issued';
        }

        // Update Kitchen Request Status
        await RationStockIssueModel.updateKitchenRequestStatus(Number(kitchen_request_id), newStatus, client);

        await client.query("COMMIT");

        return sendResponse(res, 201, true, "Stock issued successfully", {
            issue: {
                id: stockIssueId,
                issue_number: issueNumber,
                kitchen_request_id,
                issue_date,
                status: 'completed'
            },
            items: issuedItems
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in createRationStockIssue transaction:", error);
        return sendResponse(res, 400, false, error.message || "Failed to create stock issue");
    } finally {
        client.release();
    }
};

const getRationStockIssueList = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const {
            page = 1,
            limit = 10,
            search = "",
            status = ""
        } = req.body;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await RationStockIssueModel.getStockIssueList(
            institutionId,
            limitNum,
            offset,
            search,
            status
        );

        const total = await RationStockIssueModel.getStockIssueCount(
            institutionId,
            search,
            status
        );

        return sendResponse(res, 200, true, "Stock issue list fetched successfully", list, {
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

        const { id } = req.body;
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
    const client = await pool.connect();
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

        await client.query("BEGIN");

        // Lock and read Stock Issue Header
        const issueRes = await client.query(
            `SELECT id, issue_number, kitchen_request_id, status FROM ration_stock_issues WHERE id = $1 AND institution_id = $2 FOR UPDATE`,
            [Number(id), institutionId]
        );
        if (issueRes.rows.length === 0) {
            throw new Error("Stock issue record not found or unauthorized");
        }
        const issue = issueRes.rows[0];

        if (issue.status !== 'completed') {
            throw new Error(`Cannot cancel stock issue in status '${issue.status}'`);
        }

        // Lock and read Stock Issue Items
        const issueItemsRes = await client.query(
            `SELECT item_id, kitchen_request_item_id, issue_quantity, unit_price, batch_number, expiry_date FROM ration_stock_issue_items WHERE stock_issue_id = $1 AND institution_id = $2 FOR UPDATE`,
            [Number(id), institutionId]
        );
        const issueItems = issueItemsRes.rows;

        // Lock and read Kitchen Request Header
        const requestHeaderQuery = `
            SELECT id, status FROM ration_kitchen_requests WHERE id = $1 AND institution_id = $2 FOR UPDATE
        `;
        await client.query(requestHeaderQuery, [issue.kitchen_request_id, institutionId]);

        // Mark Stock Issue Cancelled
        await RationStockIssueModel.cancelStockIssue(Number(id), institutionId, client);

        // Loop over items, write reverse stock transactions and reduce request items issued_quantity
        for (const issueItem of issueItems) {
            // Create reverse transaction (quantity_in = issueItem.issue_quantity)
            await RationStockIssueModel.createStockTransaction({
                institution_id: institutionId,
                item_id: Number(issueItem.item_id),
                transaction_type: 'STOCK_ISSUE_CANCEL',
                reference_id: Number(id),
                reference_number: issue.issue_number,
                quantity_in: parseFloat(issueItem.issue_quantity),
                quantity_out: 0,
                batch_number: issueItem.batch_number,
                expiry_date: issueItem.expiry_date,
                unit_price: parseFloat(issueItem.unit_price),
                remarks: `Cancelled issue ${issue.issue_number}`,
                created_by: createdBy
            }, client);

            // Deduct from Kitchen Request Item issued_quantity
            const decrQty = -parseFloat(issueItem.issue_quantity);
            await RationStockIssueModel.updateKitchenRequestItemIssuedQuantity(
                Number(issueItem.kitchen_request_item_id),
                decrQty,
                client
            );
        }

        // Recalculate Kitchen Request status
        const updatedItemsRes = await client.query(
            `SELECT approved_quantity, issued_quantity FROM ration_kitchen_request_items WHERE request_id = $1`,
            [issue.kitchen_request_id]
        );
        const updatedItems = updatedItemsRes.rows;

        let allCompleted = true;
        let anyIssued = false;

        for (const uItem of updatedItems) {
            const uApproved = parseFloat(uItem.approved_quantity || 0);
            const uIssued = parseFloat(uItem.issued_quantity || 0);

            if (uIssued < uApproved) {
                allCompleted = false;
            }
            if (uIssued > 0) {
                anyIssued = true;
            }
        }

        let newStatus = 'approved';
        if (allCompleted && updatedItems.length > 0) {
            newStatus = 'completed';
        } else if (anyIssued) {
            newStatus = 'partially_issued';
        }

        // Update Kitchen Request Status
        await RationStockIssueModel.updateKitchenRequestStatus(issue.kitchen_request_id, newStatus, client);

        await client.query("COMMIT");

        return sendResponse(res, 200, true, "Stock issue cancelled successfully");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in cancelRationStockIssue transaction:", error);
        return sendResponse(res, 400, false, error.message || "Failed to cancel stock issue");
    } finally {
        client.release();
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
