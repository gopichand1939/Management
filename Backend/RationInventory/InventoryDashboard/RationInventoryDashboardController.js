const RationInventoryDashboardModel = require("./RationInventoryDashboardModel");

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

const getDefaultDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const firstDay = `${year}-${month}-01`;
    const day = String(now.getDate()).padStart(2, "0");
    const lastDay = `${year}-${month}-${day}`;
    return { firstDay, lastDay };
};

const getRationInventoryDashboard = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const {
            from_date,
            to_date,
            category_id = null,
            expiry_days = 30
        } = req.body;

        const defaultDates = getDefaultDates();
        const finalFromDate = from_date || defaultDates.firstDay;
        const finalToDate = to_date || defaultDates.lastDay;

        // Perform Promise.all for concurrent aggregates
        const [
            summary,
            purchaseTrend,
            issueTrend,
            categoryStock,
            lowStockItems,
            expiryAlerts,
            recentTransactions,
            topPurchasedItems,
            topIssuedItems,
            supplierPurchaseSummary,
            pendingKitchen,
            approvedWaiting,
            pendingAudits
        ] = await Promise.all([
            RationInventoryDashboardModel.getDashboardSummary(institutionId, finalFromDate, finalToDate, category_id),
            RationInventoryDashboardModel.getPurchaseTrend(institutionId, finalFromDate, finalToDate),
            RationInventoryDashboardModel.getIssueTrend(institutionId, finalFromDate, finalToDate),
            RationInventoryDashboardModel.getCategoryStockSummary(institutionId),
            RationInventoryDashboardModel.getLowStockItems(institutionId, 5, 0),
            RationInventoryDashboardModel.getExpiryAlerts(institutionId, 5, 0, expiry_days),
            RationInventoryDashboardModel.getRecentTransactions(institutionId, 5, 0),
            RationInventoryDashboardModel.getTopPurchasedItems(institutionId, finalFromDate, finalToDate),
            RationInventoryDashboardModel.getTopIssuedItems(institutionId, finalFromDate, finalToDate),
            RationInventoryDashboardModel.getSupplierPurchaseSummary(institutionId, finalFromDate, finalToDate),
            RationInventoryDashboardModel.getPendingKitchenRequests(institutionId),
            RationInventoryDashboardModel.getApprovedWaitingIssues(institutionId),
            RationInventoryDashboardModel.getPendingStockAudits(institutionId)
        ]);

        // Process unified pending actions
        const pendingActions = [];

        // 1. Pending Kitchen requests
        pendingKitchen.forEach(reqObj => {
            pendingActions.push({
                action_type: "KITCHEN_REQUEST_PENDING",
                reference_id: reqObj.id,
                reference_number: reqObj.request_number,
                title: "Kitchen Request Pending",
                description: `Request ${reqObj.request_number} requires review. Remarks: ${reqObj.remarks || "None"}`,
                priority: "medium",
                status: "pending",
                created_at: reqObj.created_at,
                route: "/ration-inventory/kitchen-request"
            });
        });

        // 2. Approved kitchen requests waiting issue
        approvedWaiting.forEach(reqObj => {
            pendingActions.push({
                action_type: "KITCHEN_REQUEST_APPROVED",
                reference_id: reqObj.id,
                reference_number: reqObj.request_number,
                title: "Approved Request Waiting Issue",
                description: `Request ${reqObj.request_number} is approved. Create Stock Issue to dispatch inventory.`,
                priority: "high",
                status: reqObj.status,
                created_at: reqObj.created_at,
                route: `/ration-inventory/stock-issue/create/${reqObj.id}`
            });
        });

        // 3. Pending Stock Audits
        pendingAudits.forEach(audit => {
            pendingActions.push({
                action_type: "STOCK_AUDIT_PENDING",
                reference_id: audit.id,
                reference_number: audit.audit_number,
                title: "Stock Audit Pending Approval",
                description: `Audit ${audit.audit_number} ('${audit.audit_name}') requires verification and approval.`,
                priority: "high",
                status: "pending",
                created_at: audit.created_at,
                route: "/ration-inventory/stock-audit"
            });
        });

        // 4. Critical low stock warnings
        lowStockItems.forEach(item => {
            if (item.current_stock <= 0) {
                pendingActions.push({
                    action_type: "ITEM_OUT_OF_STOCK",
                    reference_id: item.item_id,
                    reference_number: item.item_code,
                    title: `Item Out Of Stock: ${item.item_name}`,
                    description: `Zero units remaining. Reorder threshold is ${item.minimum_stock} ${item.unit_code}.`,
                    priority: "high",
                    status: "critical",
                    created_at: new Date().toISOString(),
                    route: "/ration-inventory/current-stock"
                });
            }
        });

        // 5. Expired or critical batches
        expiryAlerts.forEach(batch => {
            if (batch.expiry_status === "expired") {
                pendingActions.push({
                    action_type: "BATCH_EXPIRED",
                    reference_id: batch.batch_id,
                    reference_number: batch.batch_number,
                    title: `Expired Batch: ${batch.item_name}`,
                    description: `Batch ${batch.batch_number} expired on ${batch.expiry_date} with ${batch.remaining_quantity} remaining.`,
                    priority: "high",
                    status: "expired",
                    created_at: new Date().toISOString(),
                    route: "/ration-inventory/current-stock"
                });
            }
        });

        const dashboardData = {
            summary,
            stock_status: {
                in_stock: summary.in_stock_items,
                low_stock: summary.low_stock_items,
                out_of_stock: summary.out_of_stock_items
            },
            purchase_trend: purchaseTrend,
            issue_trend: issueTrend,
            category_stock: categoryStock,
            low_stock_items: lowStockItems,
            expiry_alerts: expiryAlerts,
            recent_transactions: recentTransactions,
            pending_actions: pendingActions,
            top_purchased_items: topPurchasedItems,
            top_issued_items: topIssuedItems,
            supplier_purchase_summary: supplierPurchaseSummary
        };

        const meta = {
            institution_id: institutionId,
            from_date: finalFromDate,
            to_date: finalToDate,
            expiry_days,
            generated_at: new Date().toISOString()
        };

        return sendResponse(res, 200, true, "Ration inventory dashboard fetched successfully", dashboardData, null, meta);

    } catch (error) {
        console.error("Error loading ration inventory dashboard summary:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationDashboardRecentTransactions = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { page = 1, limit = 10 } = req.body;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const transactions = await RationInventoryDashboardModel.getRecentTransactions(institutionId, limitNum, offset);
        const total = await RationInventoryDashboardModel.getRecentTransactionsCount(institutionId);

        return sendResponse(res, 200, true, "Recent stock transactions list fetched successfully", transactions, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 0
        });

    } catch (error) {
        console.error("Error loading recent transactions list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationDashboardLowStock = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { page = 1, limit = 10 } = req.body;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const lowStock = await RationInventoryDashboardModel.getLowStockItems(institutionId, limitNum, offset);
        const total = await RationInventoryDashboardModel.getLowStockCount(institutionId);

        return sendResponse(res, 200, true, "Low stock items list fetched successfully", lowStock, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 0
        });

    } catch (error) {
        console.error("Error loading low stock items list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

const getRationDashboardExpiryAlerts = async (req, res) => {
    try {
        const institutionId = await resolveInstitutionId(req);
        if (!institutionId) {
            return sendResponse(res, 401, false, "Unauthorized - Institution ID not found");
        }

        const { page = 1, limit = 10, expiry_days = 30 } = req.body;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const alerts = await RationInventoryDashboardModel.getExpiryAlerts(institutionId, limitNum, offset, expiry_days);
        const total = await RationInventoryDashboardModel.getExpiryAlertsCount(institutionId, expiry_days);

        return sendResponse(res, 200, true, "Expiry alerts list fetched successfully", alerts, {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 0
        });

    } catch (error) {
        console.error("Error loading expiry alerts list:", error);
        return sendResponse(res, 500, false, error.message || "Internal Server Error");
    }
};

module.exports = {
    getRationInventoryDashboard,
    getRationDashboardRecentTransactions,
    getRationDashboardLowStock,
    getRationDashboardExpiryAlerts
};
