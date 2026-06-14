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

const app = express();
const logDirectory = path.join(__dirname, "logs");
const runtimeLogPath = path.join(logDirectory, "runtime.log");

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

app.post("/", (req, res) => {
    res.send("Backend is running");
});

const port = process.env.PORT || 5000;

initDatabase()
    .then(() => {
        const server = app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });

        server.on("error", (error) => {
            logRuntimeEvent("HTTP Server Error", error);
        });
    })
    .catch((error) => {
        logRuntimeEvent("Database initialization failed", error);
        process.exit(1);
    });
