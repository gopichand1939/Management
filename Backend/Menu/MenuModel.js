const pool = require("../Config/Database");

const ROLE_PROFILE_MAP = {
    super_admin: 1,
    pg_admin: 2,
};

const getProfileIdByRole = (role) => {
    return ROLE_PROFILE_MAP[role] || null;
};

const getMenusByRole = async (role) => {
    const profileId = getProfileIdByRole(role);

    if (!profileId) {
        return [];
    }

    const query = `
        WITH assigned_menu_actions AS (
            SELECT
                m.menu_id,
                m.parent_menu_id,
                m.module_id,
                m.menu_name,
                m.priority AS menu_priority,
                a.action_id,
                a.action_name,
                uma.priority AS action_priority
            FROM urmg_profile_menus_actions pma
            INNER JOIN urmg_menus m
                ON m.menu_id = pma.menu_id
               AND m.status = 1
            INNER JOIN urmg_menu_actions uma
                ON uma.menu_id = pma.menu_id
               AND uma.action_id = pma.action_id
               AND uma.status = 1
            INNER JOIN urmg_actions a
                ON a.action_id = pma.action_id
               AND a.status = 1
            WHERE pma.profile_id = $1
              AND pma.status = 1
        ),
        parent_menus AS (
            SELECT DISTINCT
                parent_menu.menu_id,
                parent_menu.parent_menu_id,
                parent_menu.module_id,
                parent_menu.menu_name,
                parent_menu.priority AS menu_priority,
                NULL::INTEGER AS action_id,
                NULL::VARCHAR(50) AS action_name,
                NULL::INTEGER AS action_priority
            FROM assigned_menu_actions assigned_menu
            INNER JOIN urmg_menus parent_menu
                ON parent_menu.menu_id = assigned_menu.parent_menu_id
               AND parent_menu.status = 1
        )
        SELECT *
        FROM (
            SELECT * FROM assigned_menu_actions
            UNION ALL
            SELECT * FROM parent_menus
        ) menus
        ORDER BY menu_priority ASC, action_priority ASC NULLS FIRST, action_id ASC NULLS FIRST
    `;

    const result = await pool.query(query, [profileId]);

    const menuMap = new Map();

    for (const row of result.rows) {
        if (!menuMap.has(row.menu_id)) {
            menuMap.set(row.menu_id, {
                menu_id: row.menu_id,
                parent_menu_id: row.parent_menu_id,
                module_id: row.module_id,
                menu_name: row.menu_name,
                priority: row.menu_priority,
                actions: [],
            });
        }

        if (row.action_id) {
            menuMap.get(row.menu_id).actions.push({
                action_id: row.action_id,
                action_name: row.action_name,
                priority: row.action_priority,
            });
        }
    }

    return Array.from(menuMap.values());
};

module.exports = {
    getMenusByRole,
    getProfileIdByRole,
};
