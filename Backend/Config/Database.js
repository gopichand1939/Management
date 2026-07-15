const { Pool } = require("pg");
require("dotenv").config({ quiet: true });
const dns = require("dns");
const { AsyncLocalStorage } = require("async_hooks");

// Prefer IPv4 for DNS resolution to avoid dual-stack Neon connectivity timeouts
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
}

// Request context storage for tracing HTTP request details in query logs
const contextStorage = new AsyncLocalStorage();

// Parse tuning parameters from environment variables
const maxPoolSize = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10;
const connectionTimeout = process.env.DB_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10) : 30000;
const idleTimeout = process.env.DB_IDLE_TIMEOUT_MS ? parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10) : 60000;
const queryTimeout = process.env.DB_QUERY_TIMEOUT_MS ? parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) : 30000;
const statementTimeout = process.env.DB_STATEMENT_TIMEOUT_MS ? parseInt(process.env.DB_STATEMENT_TIMEOUT_MS, 10) : 30000;

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: maxPoolSize,
    connectionTimeoutMillis: connectionTimeout,
    idleTimeoutMillis: idleTimeout,
    query_timeout: queryTimeout,
    statement_timeout: statementTimeout,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
};

// Neon requires SSL. Parse URL or hostname.
if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("sslmode=") || process.env.DATABASE_URL.includes(".neon.tech"))) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool(poolConfig);

// Pool error listener
pool.on("error", (err) => {
    console.error("Unexpected error on idle database client:", err.message);
});

/**
 * Check if a query is safe to retry (read-only/idempotent SELECT or WITH)
 */
function isSafeToRetry(sqlText) {
    if (typeof sqlText !== "string") return false;
    const cleanSql = sqlText.trim().toUpperCase();
    return cleanSql.startsWith("SELECT") || cleanSql.startsWith("WITH");
}

/**
 * Determine if a database error is transient
 */
function isTransientError(err) {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    const code = err.code || "";

    if (
        msg.includes("authentication timed out") ||
        msg.includes("connection terminated unexpectedly") ||
        msg.includes("timeout") ||
        msg.includes("timed out") ||
        msg.includes("unexpectedly")
    ) {
        return true;
    }

    if (
        code === "ECONNRESET" ||
        code === "ETIMEDOUT" ||
        code === "ECONNREFUSED" ||
        code === "EPIPE" ||
        code === "EADDRINUSE" ||
        code === "08P01" || // Protocol violation / connection terminated unexpectedly
        code.startsWith("08") || // Connection Exception
        code.startsWith("57")    // Operator Intervention (e.g. administrator shutdown)
    ) {
        return true;
    }

    return false;
}

/**
 * Executes a PostgreSQL query with lightweight logging, transient error retries, and request context tracing.
 */
const query = async (config, values) => {
    let sqlText = "";
    let sqlValues = [];
    let queryName = "unnamed-query";

    // Handle query signature
    if (typeof config === "string") {
        sqlText = config;
        sqlValues = values || [];
    } else if (config && typeof config === "object") {
        sqlText = config.text || "";
        sqlValues = config.values || [];
        queryName = config.name || "unnamed-query";
    }

    const store = contextStorage.getStore();
    const requestId = store?.requestId || "N/A";
    const method = store?.method || "N/A";
    const requestUrl = store?.url || "N/A";

    const startTime = process.hrtime();
    let attempts = 3;
    let delay = 150;

    while (attempts > 0) {
        try {
            const result = await pool.query(sqlText, sqlValues);

            const diff = process.hrtime(startTime);
            const durationMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

            // Log successful query telemetry without printing JavaScript stack traces or values
            console.log(`[DB Query] name="${queryName}" duration=${durationMs}ms requestId="${requestId}" method="${method}" url="${requestUrl}"`);

            return result;
        } catch (err) {
            const isTransient = isTransientError(err);
            const isRetryable = isTransient && isSafeToRetry(sqlText);

            if (isRetryable && attempts > 1) {
                attempts--;
                console.warn(`[DB Query Retry] name="${queryName}" error="${err.message}" delay=${delay}ms attemptsLeft=${attempts}`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2.5; // Exponential backoff
                continue;
            }

            const diff = process.hrtime(startTime);
            const durationMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

            // Log query failure without leaking credentials
            console.error(`[DB Query Failed] name="${queryName}" duration=${durationMs}ms requestId="${requestId}" method="${method}" url="${requestUrl}" errorCode="${err.code || 'N/A'}" errorMessage="${err.message}"`);
            throw err;
        }
    }
};

/**
 * Controlled transaction execution helper
 */
const transaction = async (callback) => {
    const client = await pool.connect();
    const store = contextStorage.getStore();
    const requestId = store?.requestId || "N/A";
    const method = store?.method || "N/A";
    const requestUrl = store?.url || "N/A";

    try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rbErr) {
            console.error(`[DB Transaction Rollback Failed] requestId="${requestId}" method="${method}" url="${requestUrl}" errorMessage="${rbErr.message}"`);
        }
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Health check endpoint
 */
const healthCheck = async () => {
    try {
        const res = await pool.query("SELECT 1");
        return res.rows.length > 0;
    } catch (err) {
        console.error("Database health check failed:", err.message);
        return false;
    }
};

/**
 * Shutdown pool gracefully
 */
const shutdownPool = async () => {
    console.log("Shutting down database pool...");
    try {
        await pool.end();
        console.log("Database pool shutdown complete.");
    } catch (err) {
        console.error("Error shutting down database pool:", err.message);
    }
};

module.exports = {
    query,
    transaction,
    healthCheck,
    shutdownPool,
    contextStorage
};
