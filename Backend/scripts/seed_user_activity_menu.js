require("dotenv").config();
const { query, shutdownPool } = require("../Config/Database");

async function run() {
    try {
        console.log("Seeding User Activity menu (ID 213) into database...");
        
        // 1. Insert Menu
        // parent_menu_id = 5 (UserManagement)
        await query(`
            INSERT INTO urmg_menus (
                menu_id, 
                parent_menu_id, 
                module_id, 
                menu_name, 
                priority, 
                status, 
                inst_id
            )
            VALUES (213, 5, 1, 'User Activity', 3, 1, 1)
            ON CONFLICT (menu_id) DO UPDATE SET
                parent_menu_id = EXCLUDED.parent_menu_id,
                menu_name = EXCLUDED.menu_name,
                priority = EXCLUDED.priority;
        `);
        console.log("Seeded User Activity menu inside urmg_menus.");

        // 2. Insert Actions
        // action_id = 3 is 'View', action_id = 5 is 'List'
        await query(`
            INSERT INTO urmg_menu_actions (
                menu_id, 
                action_id, 
                priority, 
                status, 
                inst_id
            )
            VALUES 
                (213, 3, 3, 1, 1),
                (213, 5, 5, 1, 1)
            ON CONFLICT (menu_id, action_id) DO NOTHING;
        `);
        console.log("Seeded actions for User Activity menu.");

        // 3. Insert Profile Permissions
        // profile_id = 1 (super_admin), profile_id = 2 (pg_admin)
        await query(`
            INSERT INTO urmg_profile_menus_actions (
                profile_id, 
                menu_id, 
                action_id, 
                is_configuration_only, 
                status, 
                inst_id
            )
            VALUES
                (1, 213, 3, 2, 1, 1),
                (1, 213, 5, 2, 1, 1),
                (2, 213, 3, 2, 1, 1),
                (2, 213, 5, 2, 1, 1)
            ON CONFLICT (profile_id, menu_id, action_id) DO NOTHING;
        `);
        console.log("Seeded profile permissions for User Activity menu.");
        
        console.log("Seeding finished successfully!");
    } catch (e) {
        console.error("Seeding failed:", e);
    } finally {
        await shutdownPool();
    }
}

run();
