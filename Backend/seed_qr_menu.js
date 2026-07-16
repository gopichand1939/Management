require("dotenv").config();
const { query, shutdownPool } = require("c:/Users/Innovitegra Solution/Desktop/folder/Management/Backend/Config/Database");

async function run() {
    try {
        console.log("Seeding QR Labels menu (ID 212) into database...");
        
        // 1. Insert Menu
        await query(`
            INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
            VALUES (212, 200, 1, 'QR Labels', 12, 1, 1)
            ON CONFLICT (menu_id) DO UPDATE SET
                parent_menu_id = EXCLUDED.parent_menu_id,
                menu_name = EXCLUDED.menu_name,
                priority = EXCLUDED.priority;
        `);
        console.log("Seeded urmg_menus.");

        // 2. Insert Actions
        await query(`
            INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
            VALUES 
                (212, 3, 3, 1, 1),
                (212, 5, 5, 1, 1)
            ON CONFLICT (menu_id, action_id) DO NOTHING;
        `);
        console.log("Seeded urmg_menu_actions.");

        // 3. Insert Profile Actions
        await query(`
            INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
            VALUES
                (1, 212, 3, 2, 1, 1),
                (1, 212, 5, 2, 1, 1),
                (2, 212, 3, 2, 1, 1),
                (2, 212, 5, 2, 1, 1)
            ON CONFLICT (profile_id, menu_id, action_id) DO NOTHING;
        `);
        console.log("Seeded urmg_profile_menus_actions.");
        
        console.log("All seeding finished successfully!");
    } catch (e) {
        console.error("Seeding failed:", e);
    } finally {
        await shutdownPool();
    }
}

run();
