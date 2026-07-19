require("dotenv").config();
const { query, shutdownPool } = require("../Config/Database");

async function run() {
    try {
        console.log("Altering user_activity_logs table to add logout_time...");
        await query(`
            ALTER TABLE user_activity_logs
            ADD COLUMN IF NOT EXISTS logout_time TIMESTAMP
        `);
        console.log("user_activity_logs table altered successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await shutdownPool();
    }
}

run();
