require("dotenv").config();
const db = require("../Config/Database");

async function migrate() {
    try {
        console.log("Dropping old urmg_user_menu_restrictions table...");
        await db.query("DROP TABLE IF EXISTS urmg_user_menu_restrictions CASCADE");
        
        console.log("Recreating urmg_user_menu_restrictions referencing user_credentials...");
        await db.query(`
            CREATE TABLE urmg_user_menu_restrictions (
                restriction_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
                menu_id INTEGER NOT NULL REFERENCES urmg_menus(menu_id) ON DELETE CASCADE,
                action_id INTEGER REFERENCES urmg_actions(action_id) ON DELETE CASCADE,
                is_allowed BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, menu_id, action_id)
            )
        `);
        console.log("Table recreated successfully!");
    } catch (e) {
        console.error(e);
    } finally {
        await db.shutdownPool();
    }
}

migrate();
