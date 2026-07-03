const express = require("express");
const { protectAuth } = require("../../Auth/AuthMiddleware");

const {
    deleteWeeklyFoodMenu,
    getWeeklyFoodMenuGrid,
    saveWeeklyFoodMenu,
} = require("./WeeklyFoodMenuControl");

const router = express.Router();

const protectAdminAccess = protectAuth(["super_admin", "pg_admin"]);

router.post("/grid", protectAdminAccess, getWeeklyFoodMenuGrid);
router.post("/save", protectAdminAccess, saveWeeklyFoodMenu);
router.post("/delete", protectAdminAccess, deleteWeeklyFoodMenu);

module.exports = router;
