const express = require("express");
const router = express.Router();
const { protectAuth } = require("../../Auth/AuthMiddleware");
const RationStockAuditController = require("./RationStockAuditController");

const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/next-number", protectRationAccess, RationStockAuditController.getNextAuditNumber);
router.post("/create", protectRationAccess, RationStockAuditController.createStockAudit);
router.post("/edit", protectRationAccess, RationStockAuditController.updateStockAudit);
router.post("/delete", protectRationAccess, RationStockAuditController.deleteStockAudit);
router.post("/list", protectRationAccess, RationStockAuditController.getRationStockAuditList);
router.post("/view", protectRationAccess, RationStockAuditController.getRationStockAuditById);
router.post("/approve", protectRationAccess, RationStockAuditController.approveStockAudit);
router.post("/reject", protectRationAccess, RationStockAuditController.rejectStockAudit);

module.exports = router;
