const express = require("express");
const router = express.Router();
const { protectAuth } = require("../../Auth/AuthMiddleware");
const RationStockIssueController = require("./RationStockIssueController");

const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/next-number", protectRationAccess, RationStockIssueController.getNextStockIssueNumber);
router.post("/approved-requests/list", protectRationAccess, RationStockIssueController.getApprovedKitchenRequestList);
router.post("/approved-requests/view", protectRationAccess, RationStockIssueController.getApprovedKitchenRequestById);
router.post("/create", protectRationAccess, RationStockIssueController.createRationStockIssue);
router.post("/list", protectRationAccess, RationStockIssueController.getRationStockIssueList);
router.post("/view", protectRationAccess, RationStockIssueController.getRationStockIssueById);
router.post("/cancel", protectRationAccess, RationStockIssueController.cancelRationStockIssue);

module.exports = router;
