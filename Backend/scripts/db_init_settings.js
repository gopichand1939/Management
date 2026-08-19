const db = require("../Config/Database");

const initSettingsTable = async () => {
    try {
        console.log("Initializing portal_settings table...");
        
        // 1. Create table
        await db.query(`
            CREATE TABLE IF NOT EXISTS portal_settings (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
                live_support_enabled BOOLEAN DEFAULT TRUE,
                meal_tracker_enabled BOOLEAN DEFAULT TRUE,
                CONSTRAINT portal_settings_inst_unique UNIQUE (institution_id)
            )
        `);
        console.log("Table portal_settings created/verified successfully.");

        // 2. Seed defaults for existing institutions
        const seedRes = await db.query(`
            INSERT INTO portal_settings (institution_id, live_support_enabled, meal_tracker_enabled)
            SELECT id, TRUE, TRUE FROM institutions
            ON CONFLICT (institution_id) DO NOTHING
        `);
        console.log("Seeded defaults. Rows affected:", seedRes.rowCount);

        await db.shutdownPool();
        console.log("Database connection closed.");
        process.exit(0);
    } catch (err) {
        console.error("Database initialization failed:", err);
        process.exit(1);
    }
};

initSettingsTable();
