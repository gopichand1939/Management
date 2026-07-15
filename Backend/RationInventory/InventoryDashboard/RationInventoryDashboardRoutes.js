const express = require("express");
const router = express.Router();
const { protectAuth } = require("../../Auth/AuthMiddleware");
const RationInventoryDashboardController = require("./RationInventoryDashboardController");

const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/summary", protectRationAccess, RationInventoryDashboardController.getRationInventoryDashboard);
router.post("/recent-transactions", protectRationAccess, RationInventoryDashboardController.getRationDashboardRecentTransactions);
router.post("/low-stock", protectRationAccess, RationInventoryDashboardController.getRationDashboardLowStock);
router.post("/expiry-alerts", protectRationAccess, RationInventoryDashboardController.getRationDashboardExpiryAlerts);

module.exports = router;
