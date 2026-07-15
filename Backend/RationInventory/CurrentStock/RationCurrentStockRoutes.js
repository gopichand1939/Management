const express = require("express");
const router = express.Router();
const { protectAuth } = require("../../Auth/AuthMiddleware");
const {
    getRationCurrentStockList,
    getRationCurrentStockSummary,
    getRationCurrentStockByItemId,
    getRationStockTransactionHistory
} = require("./RationCurrentStockController");

const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/list", protectRationAccess, getRationCurrentStockList);
router.post("/summary", protectRationAccess, getRationCurrentStockSummary);
router.post("/view", protectRationAccess, getRationCurrentStockByItemId);
router.post("/history", protectRationAccess, getRationStockTransactionHistory);

module.exports = router;
