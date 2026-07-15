const express = require("express");
const router = express.Router();
const { protectAuth } = require("../../Auth/AuthMiddleware");
const RationStockAdjustmentController = require("./RationStockAdjustmentController");

const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/next-number", protectRationAccess, RationStockAdjustmentController.getNextAdjustmentNumber);
router.post("/create", protectRationAccess, RationStockAdjustmentController.createRationStockAdjustment);
router.post("/list", protectRationAccess, RationStockAdjustmentController.getRationStockAdjustmentList);
router.post("/view", protectRationAccess, RationStockAdjustmentController.getRationStockAdjustmentById);
router.post("/cancel", protectRationAccess, RationStockAdjustmentController.cancelRationStockAdjustment);

module.exports = router;
