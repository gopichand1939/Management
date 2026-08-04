require("dns").setDefaultResultOrder("ipv4first");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ quiet: true });

const initDatabase = require("./Config/initDatabase");
const { contextStorage, getDatabaseIdentity, getMaskedDatabaseUrl, shutdownPool } = require("./Config/Database");
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
const restrictionRoutes = require("./Restriction/RestrictionRoutes");
const userActivityRoutes = require("./UserActivity/UserActivityRoutes");
const supportRoutes = require("./Support/SupportRoutes");



const app = express();

let reqCounter = 0;
// Register HTTP request context middleware for database logging URL resolution
app.use((req, res, next) => {
    const requestId = `${Date.now()}-${++reqCounter}`;
    contextStorage.run({ requestId, method: req.method, url: req.originalUrl || req.url }, () => {
        next();
    });
});

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

process.on("SIGINT", async () => {
    logRuntimeEvent("Process Signal", "Received SIGINT");
    await shutdownPool();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    logRuntimeEvent("Process Signal", "Received SIGTERM");
    await shutdownPool();
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

app.get("/api/debug/db-info", async (req, res) => {
    if (process.env.ENABLE_DB_DEBUG !== "true") {
        return res.status(404).json({ success: false, message: "Not found" });
    }

    try {
        const dbInfo = await getDatabaseIdentity();
        res.json({ success: true, data: dbInfo });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database debug info failed",
            error: error.message,
        });
    }
});

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
app.use("/api/restriction", restrictionRoutes);
app.use("/api/user-activity", userActivityRoutes);
app.use("/api/support", supportRoutes);

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
    const server = app.listen(port, "0.0.0.0", () => {
        console.timeEnd("startup.listen");
        console.timeEnd("startup.total");
        console.log(`Database connected: ${getMaskedDatabaseUrl()}`);
        console.log(`Server running on port ${port}`);
    });

    // Initialize Socket.io
    const { Server } = require("socket.io");
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    });

    const onlineUsers = new Map();

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("join_ticket", ({ ticketId, userId, role }) => {
            socket.join(`ticket_${ticketId}`);
            console.log(`${role || 'user'} joined room ticket_${ticketId}`);

            const key = userId ? `${role}_${userId}` : `guest_${socket.id}`;
            onlineUsers.set(key, { socketId: socket.id, ticketId });
            io.to(`ticket_${ticketId}`).emit("user_status", { userId, role, online: true });
        });

        socket.on("typing", ({ ticketId, name, isTyping }) => {
            socket.to(`ticket_${ticketId}`).emit("typing_status", { name, isTyping });
        });

        socket.on("read_receipt", ({ ticketId, role }) => {
            socket.to(`ticket_${ticketId}`).emit("messages_read", { ticketId, readBy: role });
        });

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
            for (const [key, value] of onlineUsers.entries()) {
                if (value.socketId === socket.id) {
                    const parts = key.split("_");
                    const role = parts[0];
                    const userId = parts[1];
                    onlineUsers.delete(key);
                    io.to(`ticket_${value.ticketId}`).emit("user_status", { userId, role, online: false });
                    break;
                }
            }
        });
    });

    app.set("socketio", io);

    server.on("error", (error) => {
        logRuntimeEvent("HTTP Server Error", error);
    });
};

startServer().catch((error) => {
    logRuntimeEvent("Startup failed", error);
    process.exit(1);
});
