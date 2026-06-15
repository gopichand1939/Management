const express = require("express");
const { protectAuth } = require("../Auth/AuthMiddleware");
const { getDashboardOverview } = require("./DashboardController");

const router = express.Router();

router.get("/overview", protectAuth(["super_admin", "pg_admin"]), getDashboardOverview);

module.exports = router;
