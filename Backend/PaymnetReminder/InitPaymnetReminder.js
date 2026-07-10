const pool = require("../Config/Database");
const { ensurePaymentReminderSchema } = require("./PaymnetReminderModal");

const initPaymentReminder = async () => {
    await ensurePaymentReminderSchema();

    await pool.query(`
        INSERT INTO urmg_actions (action_id, action_name, priority, status, inst_id)
        VALUES
            (1, 'Create', 1, 1, 1),
            (3, 'View', 3, 1, 1),
            (5, 'List', 5, 1, 1)
        ON CONFLICT (action_id) DO UPDATE SET
            action_name = EXCLUDED.action_name,
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `);

    await pool.query(`
        INSERT INTO urmg_menus (
            menu_id,
            parent_menu_id,
            module_id,
            menu_name,
            priority,
            status,
            inst_id
        )
        VALUES (8, NULL, 1, 'TenantManagement', 4, 1, 1)
        ON CONFLICT (menu_id) DO UPDATE SET
            parent_menu_id = EXCLUDED.parent_menu_id,
            module_id = EXCLUDED.module_id,
            menu_name = EXCLUDED.menu_name,
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `);

    await pool.query(`
        INSERT INTO urmg_menus (
            menu_id,
            parent_menu_id,
            module_id,
            menu_name,
            priority,
            status,
            inst_id
        )
        VALUES (15, 8, 1, 'Payment Reminders', 5, 1, 1)
        ON CONFLICT (menu_id) DO UPDATE SET
            parent_menu_id = EXCLUDED.parent_menu_id,
            module_id = EXCLUDED.module_id,
            menu_name = EXCLUDED.menu_name,
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `);

    await pool.query(`
        INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
        VALUES
            (15, 1, 1, 1, 1),
            (15, 3, 2, 1, 1),
            (15, 5, 3, 1, 1)
        ON CONFLICT (menu_id, action_id) DO UPDATE SET
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `);

    await pool.query(`
        INSERT INTO urmg_profile_menus_actions (
            profile_id,
            menu_id,
            action_id,
            is_configuration_only,
            status,
            inst_id
        )
        VALUES
            (1, 15, 1, 2, 1, 1),
            (1, 15, 3, 2, 1, 1),
            (1, 15, 5, 2, 1, 1),
            (2, 15, 1, 2, 1, 1),
            (2, 15, 3, 2, 1, 1),
            (2, 15, 5, 2, 1, 1)
        ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
            is_configuration_only = EXCLUDED.is_configuration_only,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `);
};

if (require.main === module) {
    initPaymentReminder()
        .then(() => {
            console.log("Payment reminder menu and schema initialized");
        })
        .catch((error) => {
            console.error("Payment reminder init failed:", error);
            process.exitCode = 1;
        })
        .finally(() => pool.end());
}

module.exports = initPaymentReminder;
