const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");
const {
    getNextPurchaseNumber,
    createRationPurchase,
    getRationPurchaseList,
    getRationPurchaseById,
    updateRationPurchase,
    deleteRationPurchase,
    completeRationPurchase,
    cancelRationPurchase,
    getPurchaseDashboardData
} = require("./RationPurchaseController");

const router = express.Router();
const protectRationAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/next-number", protectRationAccess, getNextPurchaseNumber);
router.post("/create", protectRationAccess, createRationPurchase);
router.post("/list", protectRationAccess, getRationPurchaseList);
router.post("/view", protectRationAccess, getRationPurchaseById);
router.post("/edit", protectRationAccess, updateRationPurchase);
router.post("/delete-draft", protectRationAccess, deleteRationPurchase);
router.post("/complete", protectRationAccess, completeRationPurchase);
router.post("/cancel", protectRationAccess, cancelRationPurchase);
router.post("/dashboard", protectRationAccess, getPurchaseDashboardData);

module.exports = router;
