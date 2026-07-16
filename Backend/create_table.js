require("dotenv").config();
const { query, shutdownPool } = require("./Config/Database");

async function run() {
    try {
        console.log("Creating table urmg_user_menu_restrictions...");
        await query(`
            CREATE TABLE IF NOT EXISTS urmg_user_menu_restrictions (
                restriction_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES pg_admin(id) ON DELETE CASCADE,
                menu_id INTEGER NOT NULL REFERENCES urmg_menus(menu_id) ON DELETE CASCADE,
                action_id INTEGER REFERENCES urmg_actions(action_id) ON DELETE CASCADE,
                is_allowed BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, menu_id, action_id)
            )
        `);
        console.log("Table created successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await shutdownPool();
    }
}

run();
