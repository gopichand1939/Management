const { Pool } = require("pg");
require("dotenv").config({ quiet: true });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    keepAlive: true,
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});

module.exports = pool;
