const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const {
    addTenant,
    addTenantPaymentEntry,
    deleteTenant,
    editTenant,
    getBedDetails,
    getTenantStats,
    listActiveTenants,
    listTenantActivity,
    listTenantPayments,
    listVacantBeds,
    listVacatedTenants,
    transferTenant,
    vacateTenant,
    verifyTenantPaymentEntry,
    viewTenant,
} = require("./TenantController");
const { viewTenantHistory } = require("./TenantHistoryController");
const { handleTenantUpload } = require("./TenantUploadMiddleware");



const router = express.Router();
const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/create", protectAdminAccess, handleTenantUpload, addTenant);
router.post("/active", protectAdminAccess, listActiveTenants);
router.post("/vacant-beds", protectAdminAccess, listVacantBeds);
router.post("/payments", protectAdminAccess, listTenantPayments);
router.post("/vacated", protectAdminAccess, listVacatedTenants);
router.post("/view", protectAdminAccess, viewTenant);
router.post("/edit", protectAdminAccess, handleTenantUpload, editTenant);
router.post("/delete", protectAdminAccess, deleteTenant);
router.post("/payment/create", protectAdminAccess, handleTenantUpload, addTenantPaymentEntry);
router.post("/payment/verify", protectAdminAccess, verifyTenantPaymentEntry);
router.post("/bed/view", protectAdminAccess, getBedDetails);
router.post("/transfer", protectAdminAccess, transferTenant);
router.post("/vacate", protectAdminAccess, vacateTenant);
router.post("/activity", protectAdminAccess, listTenantActivity);
router.post("/history/view", protectAdminAccess, viewTenantHistory);
router.post("/stats", protectAdminAccess, getTenantStats);

module.exports = router;
