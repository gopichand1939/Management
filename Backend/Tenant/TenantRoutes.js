const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");

const router = express.Router();
const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);
const lazyHandler = (loader, exportName) => {
    return async (req, res, next) => {
        try {
            const module = loader();
            return await module[exportName](req, res, next);
        } catch (error) {
            return next(error);
        }
    };
};
const lazyMiddleware = (loader, exportName) => {
    return (req, res, next) => {
        try {
            const module = loader();
            return module[exportName](req, res, next);
        } catch (error) {
            return next(error);
        }
    };
};

router.post("/create", protectAdminAccess, lazyMiddleware(() => require("./TenantUploadMiddleware"), "handleTenantUpload"), lazyHandler(() => require("./TenantController"), "addTenant"));
router.post("/active", protectAdminAccess, lazyHandler(() => require("./TenantController"), "listActiveTenants"));
router.post("/vacant-beds", protectAdminAccess, lazyHandler(() => require("./TenantController"), "listVacantBeds"));
router.post("/payments", protectAdminAccess, lazyHandler(() => require("./TenantController"), "listTenantPayments"));
router.post("/vacated", protectAdminAccess, lazyHandler(() => require("./TenantController"), "listVacatedTenants"));
router.post("/view", protectAdminAccess, lazyHandler(() => require("./TenantController"), "viewTenant"));
router.post("/edit", protectAdminAccess, lazyMiddleware(() => require("./TenantUploadMiddleware"), "handleTenantUpload"), lazyHandler(() => require("./TenantController"), "editTenant"));
router.post("/delete", protectAdminAccess, lazyHandler(() => require("./TenantController"), "deleteTenant"));
router.post("/payment/create", protectAdminAccess, lazyMiddleware(() => require("./TenantUploadMiddleware"), "handleTenantUpload"), lazyHandler(() => require("./TenantController"), "addTenantPaymentEntry"));
router.post("/payment/verify", protectAdminAccess, lazyHandler(() => require("./TenantController"), "verifyTenantPaymentEntry"));
router.post("/bed/view", protectAdminAccess, lazyHandler(() => require("./TenantController"), "getBedDetails"));
router.post("/transfer", protectAdminAccess, lazyHandler(() => require("./TenantController"), "transferTenant"));
router.post("/vacate", protectAdminAccess, lazyHandler(() => require("./TenantController"), "vacateTenant"));
router.post("/activity", protectAdminAccess, lazyHandler(() => require("./TenantController"), "listTenantActivity"));
router.post("/history/view", protectAdminAccess, lazyHandler(() => require("./TenantHistoryController"), "viewTenantHistory"));
router.post("/stats", protectAdminAccess, lazyHandler(() => require("./TenantController"), "getTenantStats"));

module.exports = router;
