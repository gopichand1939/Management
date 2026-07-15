const express = require("express");
const router = express.Router();
const { protectAuth } = require("../../Auth/AuthMiddleware");
const KitchenRequestController = require("./KitchenRequestController");

const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectRationAccess, KitchenRequestController.createKitchenRequest);
router.post("/list", protectRationAccess, KitchenRequestController.getKitchenRequestList);
router.post("/view", protectRationAccess, KitchenRequestController.getKitchenRequestById);
router.post("/edit", protectRationAccess, KitchenRequestController.updateKitchenRequest);
router.post("/delete", protectRationAccess, KitchenRequestController.deleteKitchenRequest);
router.post("/approve", protectRationAccess, KitchenRequestController.approveKitchenRequest);
router.post("/reject", protectRationAccess, KitchenRequestController.rejectKitchenRequest);
router.post("/next-number", protectRationAccess, KitchenRequestController.getNextRequestNumber);
router.post("/dashboard", protectRationAccess, KitchenRequestController.getKitchenRequestSummary);

module.exports = router;
