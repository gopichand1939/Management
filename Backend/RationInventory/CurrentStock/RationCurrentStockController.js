const RationCurrentStockModel = require("./RationCurrentStockModel");

const getRationCurrentStockList = async (req, res) => {
    try {
        let institutionId = req.user?.institution_id;
        if ((req.user?.profile_id === 1 || req.user?.role === "super_admin") && req.body.institution_id) {
            institutionId = Number(req.body.institution_id);
        }
        if (!institutionId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Institution ID not found"
            });
        }

        const {
            page = 1,
            limit = 10,
            search = "",
            category_id = null,
            unit_id = null,
            stock_status = "",
            item_status = "active"
        } = req.body;

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const list = await RationCurrentStockModel.getCurrentStockList(
            institutionId,
            limitNum,
            offset,
            search,
            category_id ? Number(category_id) : null,
            unit_id ? Number(unit_id) : null,
            stock_status,
            item_status
        );

        const total = await RationCurrentStockModel.getCurrentStockCount(
            institutionId,
            search,
            category_id ? Number(category_id) : null,
            unit_id ? Number(unit_id) : null,
            stock_status,
            item_status
        );

        return res.status(200).json({
            success: true,
            message: "Current stock list fetched successfully",
            data: list,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum) || 1
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch stock list"
        });
    }
};

const getRationCurrentStockSummary = async (req, res) => {
    try {
        let institutionId = req.user?.institution_id;
        if ((req.user?.profile_id === 1 || req.user?.role === "super_admin") && req.body.institution_id) {
            institutionId = Number(req.body.institution_id);
        }
        if (!institutionId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Institution ID not found"
            });
        }

        const summary = await RationCurrentStockModel.getCurrentStockSummary(institutionId);

        return res.status(200).json({
            success: true,
            message: "Current stock summary fetched successfully",
            data: summary
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch stock summary"
        });
    }
};

const getRationCurrentStockByItemId = async (req, res) => {
    try {
        const { item_id } = req.body;
        if (!item_id) {
            return res.status(400).json({
                success: false,
                message: "Item ID is required"
            });
        }

        let institutionId = req.user?.institution_id;
        if (req.user?.profile_id === 1 || req.user?.role === "super_admin") {
            if (req.body.institution_id) {
                institutionId = Number(req.body.institution_id);
            } else {
                institutionId = await RationCurrentStockModel.getItemInstitutionId(Number(item_id));
            }
        }
        if (!institutionId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Institution ID not found"
            });
        }

        const itemStock = await RationCurrentStockModel.getCurrentStockByItemId(Number(item_id), institutionId);
        if (!itemStock) {
            return res.status(404).json({
                success: false,
                message: "Item not found or does not belong to this institution"
            });
        }

        const lastPurchase = await RationCurrentStockModel.getLastPurchaseForItem(Number(item_id), institutionId);
        const recentTransactions = await RationCurrentStockModel.getStockTransactionHistory(
            Number(item_id),
            institutionId,
            5,
            0
        );

        return res.status(200).json({
            success: true,
            message: "Current stock details fetched successfully",
            data: {
                item: {
                    item_id: itemStock.item_id,
                    item_name: itemStock.item_name,
                    item_code: itemStock.item_code,
                    sku_id: itemStock.sku_id,
                    barcode: itemStock.barcode,
                    image_url: itemStock.image_url,
                    category: {
                        category_id: itemStock.category_id,
                        category_name: itemStock.category_name,
                        category_code: itemStock.category_code
                    },
                    unit: {
                        unit_id: itemStock.unit_id,
                        unit_name: itemStock.unit_name,
                        unit_code: itemStock.unit_code
                    },
                    status: itemStock.status
                },
                stock: {
                    current_stock: parseFloat(itemStock.current_stock),
                    minimum_stock: parseFloat(itemStock.minimum_stock),
                    maximum_stock: parseFloat(itemStock.maximum_stock),
                    reorder_quantity: parseFloat(itemStock.reorder_quantity),
                    stock_value: parseFloat(itemStock.stock_value),
                    stock_status: itemStock.stock_status
                },
                last_purchase: lastPurchase ? {
                    purchase_number: lastPurchase.purchase_number,
                    supplier_name: lastPurchase.supplier_name,
                    purchase_date: lastPurchase.purchase_date,
                    quantity: parseFloat(lastPurchase.quantity),
                    unit_price: parseFloat(lastPurchase.unit_price)
                } : null,
                recent_transactions: recentTransactions.map(tx => ({
                    transaction_id: tx.transaction_id,
                    transaction_type: tx.transaction_type,
                    reference_type: tx.reference_type,
                    reference_id: tx.reference_id,
                    reference_number: tx.reference_number,
                    quantity_in: parseFloat(tx.quantity_in),
                    quantity_out: parseFloat(tx.quantity_out),
                    unit_price: parseFloat(tx.unit_price),
                    transaction_date: tx.transaction_date,
                    remarks: tx.remarks,
                    created_by: tx.created_by
                }))
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch stock item details"
        });
    }
};

const getRationStockTransactionHistory = async (req, res) => {
    try {
        const {
            item_id,
            page = 1,
            limit = 10,
            transaction_type = "",
            search = "",
            start_date = null,
            end_date = null
        } = req.body;

        if (!item_id) {
            return res.status(400).json({
                success: false,
                message: "Item ID is required"
            });
        }

        let institutionId = req.user?.institution_id;
        if (req.user?.profile_id === 1 || req.user?.role === "super_admin") {
            if (req.body.institution_id) {
                institutionId = Number(req.body.institution_id);
            } else {
                institutionId = await RationCurrentStockModel.getItemInstitutionId(Number(item_id));
            }
        }
        if (!institutionId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized - Institution ID not found"
            });
        }

        // Verify item accessibility
        const itemStock = await RationCurrentStockModel.getCurrentStockByItemId(Number(item_id), institutionId);
        if (!itemStock) {
            return res.status(404).json({
                success: false,
                message: "Item not found or does not belong to this institution"
            });
        }

        const limitNum = parseInt(limit) || 10;
        const pageNum = parseInt(page) || 1;
        const offset = (pageNum - 1) * limitNum;

        const filters = {
            transaction_type,
            search,
            start_date,
            end_date
        };

        const list = await RationCurrentStockModel.getStockTransactionHistory(
            Number(item_id),
            institutionId,
            limitNum,
            offset,
            filters
        );

        const total = await RationCurrentStockModel.getStockTransactionHistoryCount(
            Number(item_id),
            institutionId,
            filters
        );

        return res.status(200).json({
            success: true,
            message: "Stock transaction history fetched successfully",
            data: list.map(tx => ({
                transaction_id: tx.transaction_id,
                transaction_type: tx.transaction_type,
                reference_type: tx.reference_type,
                reference_id: tx.reference_id,
                reference_number: tx.reference_number,
                quantity_in: parseFloat(tx.quantity_in),
                quantity_out: parseFloat(tx.quantity_out),
                unit_price: parseFloat(tx.unit_price),
                transaction_date: tx.transaction_date,
                remarks: tx.remarks,
                created_by: tx.created_by
            })),
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum) || 1
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch stock history list"
        });
    }
};

module.exports = {
    getRationCurrentStockList,
    getRationCurrentStockSummary,
    getRationCurrentStockByItemId,
    getRationStockTransactionHistory
};
