require("dns").setDefaultResultOrder("ipv4first");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ quiet: true });

const initDatabase = require("./Config/initDatabase");
const authRoutes = require("./Auth/AuthRoutes");
const superAdminRoutes = require("./SuperAdmin/SuperAdminRoutes");
const institutionRoutes = require("./Institution/InstitutionRoutes");
const pgAdminRoutes = require("./PGAdmin/PGAdminRoutes");
const tenantRoutes = require("./Tenant/TenantRoutes");
const dashboardRoutes = require("./Dashboard/DashboardRoutes");
const inventoryManagementRoutes = require("./InventoryManagement/InventoryManagementRoutes");
const mealTypeRoutes = require("./Expenses/MealTypeMaster/MealTypeRoutes");
const weeklyFoodMenuRoutes = require("./Expenses/WeeklyFoodMenu/WeeklyFoodMenuRoutes");
const dailyExpensesRoutes = require("./Expenses/DailyExpensesSpend/DailyexpensesRoutes");
const paymentReminderRoutes = require("./PaymnetReminder/PaymnetReminderRoutes");
const rationCategoryRoutes = require("./RationInventory/CategoryMaster/RationCategoryRoutes");
const rationUnitRoutes = require("./RationInventory/UnitMaster/RationUnitRoutes");
const rationItemRoutes = require("./RationInventory/ItemMaster/RationItemRoutes");
const rationSupplierRoutes = require("./RationInventory/SupplierMaster/RationSupplierRoutes");
const rationPurchaseRoutes = require("./RationInventory/Purchase/RationPurchaseRoutes");
const rationCurrentStockRoutes = require("./RationInventory/CurrentStock/RationCurrentStockRoutes");
const rationKitchenRequestRoutes = require("./RationInventory/KitchenRequest/KitchenRequestRoutes");
const rationStockIssueRoutes = require("./RationInventory/StockIssue/RationStockIssueRoutes");
const rationStockAdjustmentRoutes = require("./RationInventory/StockAdjustment/RationStockAdjustmentRoutes");
const rationStockAuditRoutes = require("./RationInventory/StockAudit/RationStockAuditRoutes");
const rationInventoryDashboardRoutes = require("./RationInventory/InventoryDashboard/RationInventoryDashboardRoutes");



const app = express();
const logDirectory = path.join(__dirname, "logs");
const runtimeLogPath = path.join(logDirectory, "runtime.log");
const shouldInitDatabaseOnStartup = process.env.RUN_DB_INIT_ON_STARTUP === "true";

const ensureLogDirectory = () => {
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true });
    }
};

const formatErrorDetails = (value) => {
    if (value instanceof Error) {
        return value.stack || value.message;
    }

    if (typeof value === "string") {
        return value;
    }

    try {
        return JSON.stringify(value, null, 2);
    } catch (error) {
        return String(value);
    }
};

const logRuntimeEvent = (label, details) => {
    const message = `[${new Date().toISOString()}] ${label}\n${formatErrorDetails(details)}\n\n`;

    ensureLogDirectory();
    fs.appendFileSync(runtimeLogPath, message);
    console.error(message);
};

process.on("unhandledRejection", (reason) => {
    logRuntimeEvent("Unhandled Rejection", reason);
});

process.on("uncaughtException", (error) => {
    logRuntimeEvent("Uncaught Exception", error);
});

process.on("warning", (warning) => {
    logRuntimeEvent("Process Warning", warning);
});

process.on("SIGINT", () => {
    logRuntimeEvent("Process Signal", "Received SIGINT");
    process.exit(0);
});

process.on("SIGTERM", () => {
    logRuntimeEvent("Process Signal", "Received SIGTERM");
    process.exit(0);
});

process.on("exit", (code) => {
    logRuntimeEvent("Process Exit", `Node process exited with code ${code}`);
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/tenant", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many tenant requests, please try again later",
    },
}));

app.use("/api/auth", authRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/institution", institutionRoutes);
app.use("/api/pg-admin", pgAdminRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryManagementRoutes);
app.use("/api/daily-expenses", dailyExpensesRoutes);
app.use("/api/meal-type", mealTypeRoutes);
app.use("/api/weekly-food-menu", weeklyFoodMenuRoutes);
app.use("/api/payment-reminder", paymentReminderRoutes);
app.use("/api/ration-category", rationCategoryRoutes);
app.use("/api/ration-unit", rationUnitRoutes);
app.use("/api/ration-item", rationItemRoutes);
app.use("/api/ration-supplier", rationSupplierRoutes);
app.use("/api/ration-purchase", rationPurchaseRoutes);
app.use("/api/ration-current-stock", rationCurrentStockRoutes);
app.use("/api/ration-kitchen-request", rationKitchenRequestRoutes);
app.use("/api/ration-stock-issue", rationStockIssueRoutes);
app.use("/api/ration-stock-adjustment", rationStockAdjustmentRoutes);
app.use("/api/ration-stock-audit", rationStockAuditRoutes);
app.use("/api/ration-inventory-dashboard", rationInventoryDashboardRoutes);

app.post("/", (req, res) => {
    res.send("Backend is running");
});

const port = process.env.PORT || 5000;

const startServer = async () => {
    console.time("startup.total");

    if (shouldInitDatabaseOnStartup) {
        console.time("startup.initDatabase");
        await initDatabase();
        console.timeEnd("startup.initDatabase");
    }

    console.time("startup.listen");
    const server = app.listen(port, () => {
        console.timeEnd("startup.listen");
        console.timeEnd("startup.total");
        console.log(`Server running on port ${port}`);
    });

    server.on("error", (error) => {
        logRuntimeEvent("HTTP Server Error", error);
    });
};

startServer().catch((error) => {
    logRuntimeEvent("Startup failed", error);
    process.exit(1);
});
