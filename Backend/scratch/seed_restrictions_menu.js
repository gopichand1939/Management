require("dotenv").config();
const db = require("../Config/Database");

async function seedMenus() {
    try {
        console.log("Inserting dynamic menus into urmg_menus...");
        await db.query(`
            INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
            VALUES 
                (150, NULL, 1, 'Daily Meal Tracker', 150, 1, 1),
                (998, NULL, 1, 'Restrictions', 998, 1, 1)
            ON CONFLICT (menu_id) DO UPDATE SET
                menu_name = EXCLUDED.menu_name,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status;
        `);

        console.log("Inserting menu actions into urmg_menu_actions...");
        await db.query(`
            INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
            VALUES 
                (150, 3, 1, 1, 1),
                (150, 5, 2, 1, 1),
                (998, 3, 1, 1, 1),
                (998, 5, 2, 1, 1)
            ON CONFLICT (menu_id, action_id) DO NOTHING;
        `);

        console.log("Assigning menus to profiles (urmg_profile_menus_actions)...");
        await db.query(`
            INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
            VALUES 
                -- Super Admin (profile_id = 1) gets both Restrictions and Daily Meal Tracker
                (1, 150, 3, 2, 1, 1),
                (1, 150, 5, 2, 1, 1),
                (1, 998, 3, 2, 1, 1),
                (1, 998, 5, 2, 1, 1),
                -- PG Admin (profile_id = 2) gets only Daily Meal Tracker
                (2, 150, 3, 2, 1, 1),
                (2, 150, 5, 2, 1, 1)
            ON CONFLICT (profile_id, menu_id, action_id) DO NOTHING;
        `);

        console.log("Database seeded successfully!");
    } catch (e) {
        console.error("Seeding failed:", e);
    } finally {
        await db.shutdownPool();
    }
}

seedMenus();
