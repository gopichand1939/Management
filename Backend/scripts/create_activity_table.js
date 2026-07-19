require("dotenv").config();
const { query, shutdownPool } = require("../Config/Database");

async function run() {
    try {
        console.log("Creating user_activity_logs table in database...");
        await query(`
            CREATE TABLE IF NOT EXISTS user_activity_logs (
                id SERIAL PRIMARY KEY,
                credential_id INTEGER REFERENCES user_credentials(id) ON DELETE SET NULL,
                email VARCHAR(150) NOT NULL,
                role VARCHAR(50) NOT NULL,
                institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
                latitude NUMERIC(10, 7),
                longitude NUMERIC(10, 7),
                device_info VARCHAR(255),
                platform VARCHAR(50) NOT NULL DEFAULT 'Web',
                ip_address VARCHAR(45),
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("user_activity_logs table created successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await shutdownPool();
    }
}

run();
