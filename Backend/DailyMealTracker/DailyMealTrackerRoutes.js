const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const controller = require("./DailyMealTrackerController");

const router = express.Router();
const protectAdmin = protectAuth(["super_admin", "pg_admin"]);

// Admin Authenticated Endpoints
router.get("/admin/summary", protectAdmin, controller.getDailySummary);
router.get("/admin/meals", protectAdmin, controller.listDailyMeals);
router.post("/admin/meals/update", protectAdmin, controller.updateMealEntry);
router.post("/admin/meals/bulk-update", protectAdmin, controller.bulkUpdateMealEntries);
router.get("/admin/report/monthly", protectAdmin, controller.getMonthlyReport);
router.post("/admin/actual-stats", protectAdmin, controller.saveActualStats);
router.get("/admin/report/day-wise", protectAdmin, controller.getDayWiseReport);
router.get("/admin/settings", protectAdmin, controller.getPortalSettings);
router.post("/admin/settings/save", protectAdmin, controller.savePortalSettings);

// Public / Tenant Portal Endpoints
router.post("/tenant/verify", controller.verifyTenantPhone);
router.get("/tenant/meals/:tenantId", controller.getTenantMeals);
router.post("/tenant/meals/save", controller.saveTenantMeals);

module.exports = router;
