const pool = require("../../Config/Database");
const RationPurchaseModel = require("./RationPurchaseModel");
const RationItemModel = require("../ItemMaster/RationItemModel");
const RationSupplierModel = require("../SupplierMaster/RationSupplierModel");

// Response wrapper utility
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

const getNextPurchaseNumber = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const nextNum = await RationPurchaseModel.getNextPurchaseNumber(institutionId);
        return sendResponse(res, 200, true, "Next purchase number generated successfully", { purchase_number: nextNum });
    } catch (error) {
        console.error("Error generating next purchase number:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const validatePurchaseData = async (institutionId, reqData) => {
    const {
        purchase_date,
        supplier_id,
        invoice_date,
        paid_amount = 0,
        items = [],
        other_charges = 0
    } = reqData;

    // Basic Header Validations
    if (!purchase_date) {
        throw new Error("Purchase date is required");
    }
    if (!supplier_id) {
        throw new Error("Supplier is required");
    }
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("At least one item is required in the purchase");
    }

    const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());

    if (purchase_date > todayStr) {
        throw new Error("Purchase date cannot exceed today");
    }

    if (invoice_date && invoice_date > purchase_date) {
        throw new Error("Invoice date cannot exceed purchase date");
    }

    // Verify Supplier
    const supplier = await RationSupplierModel.getRationSupplierById(supplier_id, institutionId);
    if (!supplier) {
        throw new Error("Selected supplier does not exist");
    }
    if (supplier.status !== "active") {
        throw new Error(`Selected supplier '${supplier.supplier_name}' is inactive`);
    }

    // Verify item uniqueness rules
    const itemUniqueKeys = new Set();
    const batchUniqueKeys = new Set();

    let calculatedSubTotal = 0;
    let calculatedDiscountTotal = 0;
    let calculatedGstTotal = 0;

    for (const item of items) {
        if (!item.item_id) {
            throw new Error("Item ID is required for all rows");
        }

        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) {
            throw new Error("Quantity must be greater than 0");
        }

        const freeQty = parseFloat(item.free_quantity || 0);
        if (isNaN(freeQty) || freeQty < 0) {
            throw new Error("Free quantity cannot be negative");
        }

        const price = parseFloat(item.unit_price);
        if (isNaN(price) || price < 0) {
            throw new Error("Unit price cannot be negative");
        }

        const discPct = parseFloat(item.discount_percentage || 0);
        if (isNaN(discPct) || discPct < 0 || discPct > 100) {
            throw new Error("Discount percentage must be between 0 and 100");
        }

        const gstPct = parseFloat(item.gst_percentage || 0);
        if (isNaN(gstPct) || gstPct < 0 || gstPct > 100) {
            throw new Error("GST percentage must be between 0 and 100");
        }

        // Fetch item to verify tracking and active status
        const dbItem = await RationItemModel.getRationItemById(item.item_id, institutionId);
        if (!dbItem) {
            throw new Error(`Item with ID ${item.item_id} not found`);
        }
        if (dbItem.status !== "active") {
            throw new Error(`Item '${dbItem.item_name}' is inactive`);
        }

        // Verify category active
        const catRes = await pool.query("SELECT status FROM ration_item_categories WHERE id = $1", [dbItem.category_id]);
        if (catRes.rows.length === 0 || catRes.rows[0].status !== "active") {
            throw new Error(`Category linked to item '${dbItem.item_name}' is inactive`);
        }

        // Verify unit active
        const unitRes = await pool.query("SELECT status FROM ration_units WHERE id = $1", [dbItem.unit_id]);
        if (unitRes.rows.length === 0 || unitRes.rows[0].status !== "active") {
            throw new Error(`Unit linked to item '${dbItem.item_name}' is inactive`);
        }

        // Batch tracking validations
        if (dbItem.batch_tracking) {
            if (!item.batch_number || !item.batch_number.trim()) {
                throw new Error(`Batch number is required for item '${dbItem.item_name}'`);
            }
        }

        // Expiry tracking validations
        if (dbItem.expiry_tracking) {
            if (!item.expiry_date) {
                throw new Error(`Expiry date is required for item '${dbItem.item_name}'`);
            }
        }

        if (item.manufacturing_date && item.manufacturing_date > todayStr) {
            throw new Error(`Manufacturing date for item '${dbItem.item_name}' cannot exceed today`);
        }

        if (item.expiry_date && item.manufacturing_date && item.expiry_date < item.manufacturing_date) {
            throw new Error(`Expiry date for item '${dbItem.item_name}' cannot be before manufacturing date`);
        }

        // Duplicate checks
        const cleanBatch = (item.batch_number || "").trim().toUpperCase();
        const expiryStr = item.expiry_date || "NO_EXPIRY";
        const itemKey = `${item.item_id}_${cleanBatch}_${expiryStr}`;
        if (itemUniqueKeys.has(itemKey)) {
            throw new Error(`Duplicate item row found in purchase: '${dbItem.item_name}' with same batch and expiry`);
        }
        itemUniqueKeys.add(itemKey);

        if (cleanBatch) {
            const batchKey = `${item.item_id}_${cleanBatch}`;
            if (batchUniqueKeys.has(batchKey)) {
                throw new Error(`Duplicate batch '${item.batch_number}' entered for item '${dbItem.item_name}' within this purchase`);
            }
            batchUniqueKeys.add(batchKey);
        }

        // Financial calculations verification
        const grossAmount = qty * price;
        const discAmt = grossAmount * (discPct / 100);
        const taxableAmount = grossAmount - discAmt;
        const gstAmt = taxableAmount * (gstPct / 100);
        const lineTotal = taxableAmount + gstAmt;

        calculatedSubTotal += grossAmount;
        calculatedDiscountTotal += discAmt;
        calculatedGstTotal += gstAmt;
    }

    const calculatedGrandTotal = Math.round(calculatedSubTotal - calculatedDiscountTotal + calculatedGstTotal + parseFloat(other_charges || 0));

    const pAmt = parseFloat(paid_amount || 0);
    if (pAmt > calculatedGrandTotal) {
        throw new Error(`Paid amount (₹${pAmt}) cannot exceed grand total (₹${calculatedGrandTotal})`);
    }
};

const createRationPurchase = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const pgAdminId = req.user?.pg_admin_id;
    const createdBy = req.user?.id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        // Run validations first
        await validatePurchaseData(institutionId, req.body);

        const {
            purchase_date,
            supplier_id,
            supplier_invoice_number,
            invoice_date,
            notes,
            other_charges = 0,
            paid_amount = 0,
            status = "draft",
            items = []
        } = req.body;

        const purchaseData = {
            institution_id: institutionId,
            pg_admin_id: pgAdminId,
            purchase_date,
            supplier_id,
            supplier_invoice_number,
            invoice_date,
            notes,
            other_charges,
            paid_amount,
            status
        };

        const result = await RationPurchaseModel.createRationPurchase(
            purchaseData,
            items,
            createdBy
        );

        return sendResponse(res, 201, true, `Purchase entry created successfully as ${status}`, result);
    } catch (error) {
        console.error("Error creating ration purchase:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const getRationPurchaseList = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 10;
        const offset = (page - 1) * limit;
        const { search = "", status = "", filters = {} } = req.body;

        const purchases = await RationPurchaseModel.getRationPurchaseList(
            institutionId,
            limit,
            offset,
            search,
            status,
            filters
        );

        const totalCount = await RationPurchaseModel.getRationPurchaseCount(
            institutionId,
            search,
            status,
            filters
        );

        const pagination = {
            total: totalCount,
            page,
            limit,
            pages: Math.ceil(totalCount / limit)
        };

        return sendResponse(res, 200, true, "Ration purchase list fetched successfully", purchases, pagination);
    } catch (error) {
        console.error("Error fetching purchase list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationPurchaseById = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return sendResponse(res, 400, false, "Purchase ID is required");
        }

        const purchase = await RationPurchaseModel.getRationPurchaseById(id, institutionId);

        if (!purchase) {
            return sendResponse(res, 404, false, "Purchase record not found");
        }

        return sendResponse(res, 200, true, "Ration purchase fetched successfully", purchase);
    } catch (error) {
        console.error("Error fetching purchase detail:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const updateRationPurchase = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const updatedBy = req.user?.id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return sendResponse(res, 400, false, "Purchase ID is required");
        }

        // Run validations first
        await validatePurchaseData(institutionId, req.body);

        const {
            purchase_date,
            supplier_id,
            supplier_invoice_number,
            invoice_date,
            notes,
            other_charges = 0,
            paid_amount = 0,
            status = "draft",
            items = []
        } = req.body;

        const purchaseData = {
            purchase_date,
            supplier_id,
            supplier_invoice_number,
            invoice_date,
            notes,
            other_charges,
            paid_amount,
            status
        };

        const result = await RationPurchaseModel.updateRationPurchase(
            id,
            institutionId,
            purchaseData,
            items,
            updatedBy
        );

        return sendResponse(res, 200, true, `Purchase updated successfully as ${status}`, result);
    } catch (error) {
        console.error("Error updating ration purchase:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const deleteRationPurchase = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const performedBy = req.user?.id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return sendResponse(res, 400, false, "Purchase ID is required");
        }

        const result = await RationPurchaseModel.deleteRationPurchase(id, institutionId, performedBy);

        return sendResponse(res, 200, true, "Draft purchase deleted successfully", result);
    } catch (error) {
        console.error("Error deleting draft purchase:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const completeRationPurchase = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const updatedBy = req.user?.id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const id = req.body.id || req.params.id;

        if (!id) {
            return sendResponse(res, 400, false, "Purchase ID is required");
        }

        const result = await RationPurchaseModel.completeRationPurchase(id, institutionId, updatedBy);

        return sendResponse(res, 200, true, "Purchase completed successfully. Stock updated.", result);
    } catch (error) {
        console.error("Error completing purchase:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const cancelRationPurchase = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;
    const updatedBy = req.user?.id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const id = req.body.id || req.params.id;
        const { reason = "" } = req.body;

        if (!id) {
            return sendResponse(res, 400, false, "Purchase ID is required");
        }

        const result = await RationPurchaseModel.cancelRationPurchase(id, institutionId, updatedBy, reason);

        return sendResponse(res, 200, true, "Purchase cancelled successfully. Stock reversed.", result);
    } catch (error) {
        console.error("Error cancelling purchase:", error);
        return sendResponse(res, 400, false, error.message || "Bad Request");
    }
};

const getPurchaseDashboardData = async (req, res) => {
    const institutionId = req.user?.institution_id || req.body.institution_id;

    if (!institutionId) {
        return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
    }

    try {
        const data = await RationPurchaseModel.getPurchaseDashboardData(institutionId);
        return sendResponse(res, 200, true, "Purchase dashboard data fetched successfully", data);
    } catch (error) {
        console.error("Error fetching purchase dashboard data:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

module.exports = {
    getNextPurchaseNumber,
    createRationPurchase,
    getRationPurchaseList,
    getRationPurchaseById,
    updateRationPurchase,
    deleteRationPurchase,
    completeRationPurchase,
    cancelRationPurchase,
    getPurchaseDashboardData
};
