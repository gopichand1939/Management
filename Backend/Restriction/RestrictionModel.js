const db = require("../Config/Database");

const getAdmins = async (institutionId = null) => {
    const values = [];
    let sql = "";
    if (institutionId && institutionId !== "all") {
        values.push(Number(institutionId), Number(institutionId));
        sql = `
            SELECT 
                uc.id,
                sa.name,
                sa.email,
                sa.phone,
                sa.institution_id,
                'All Institutions' AS institution,
                'super_admin' AS role
            FROM super_admins sa
            INNER JOIN user_credentials uc ON uc.super_admin_id = sa.id
            WHERE sa.institution_id = $1

            UNION ALL

            SELECT 
                uc.id,
                p.pg_admin_name AS name,
                p.email,
                p.phone,
                p.institution_id,
                i.institution_name AS institution,
                'pg_admin' AS role
            FROM pg_admin p
            INNER JOIN user_credentials uc ON uc.pg_admin_id = p.id
            LEFT JOIN institutions i ON i.id = p.institution_id
            WHERE p.institution_id = $2
            
            ORDER BY name ASC
        `;
    } else {
        sql = `
            SELECT 
                uc.id,
                sa.name,
                sa.email,
                sa.phone,
                sa.institution_id,
                'All Institutions' AS institution,
                'super_admin' AS role
            FROM super_admins sa
            INNER JOIN user_credentials uc ON uc.super_admin_id = sa.id

            UNION ALL

            SELECT 
                uc.id,
                p.pg_admin_name AS name,
                p.email,
                p.phone,
                p.institution_id,
                i.institution_name AS institution,
                'pg_admin' AS role
            FROM pg_admin p
            INNER JOIN user_credentials uc ON uc.pg_admin_id = p.id
            LEFT JOIN institutions i ON i.id = p.institution_id
            
            ORDER BY name ASC
        `;
    }
    const res = await db.query(sql, values);
    return res.rows;
};

const getRules = async (userId) => {
    const sql = `
        SELECT 
            menu_id,
            action_id,
            is_allowed
        FROM urmg_user_menu_restrictions
        WHERE user_id = $1
    `;
    const res = await db.query(
        sql,
        [userId]
    );
    return res.rows;
};

const deleteRules = async (userId) => {
    const sql = `
        DELETE FROM urmg_user_menu_restrictions
        WHERE user_id = $1
    `;
    await db.query(
        sql,
        [userId]
    );
};

const addRule = async (
    userId,
    menuId,
    actionId,
    isAllowed
) => {
    const sql = `
        INSERT INTO urmg_user_menu_restrictions (
            user_id,
            menu_id,
            action_id,
            is_allowed
        )
        VALUES ($1, $2, $3, $4)
    `;
    await db.query(
        sql,
        [
            userId,
            menuId,
            actionId,
            isAllowed
        ]
    );
};

const getMenuTree = async () => {
    // Fetch all active menus (full menu list) and their actions
    const sql = `
        SELECT
            m.menu_id,
            m.parent_menu_id,
            m.menu_name,
            m.priority AS menu_priority,
            a.action_id,
            a.action_name,
            uma.priority AS action_priority
        FROM urmg_menus m
        LEFT JOIN urmg_menu_actions uma
            ON uma.menu_id = m.menu_id AND uma.status = 1
        LEFT JOIN urmg_actions a
            ON a.action_id = uma.action_id AND a.status = 1
        WHERE m.status = 1
        ORDER BY menu_priority ASC, action_priority ASC NULLS LAST
    `;
    const res = await db.query(sql);

    const menuMap = new Map();

    for (const row of res.rows) {
        if (!menuMap.has(row.menu_id)) {
            menuMap.set(row.menu_id, {
                menu_id: row.menu_id,
                parent_menu_id: row.parent_menu_id,
                menu_name: row.menu_name,
                priority: row.menu_priority,
                actions: []
            });
        }
        if (row.action_id) {
            menuMap.get(row.menu_id).actions.push({
                action_id: row.action_id,
                action_name: row.action_name,
                priority: row.action_priority
            });
        }
    }

    // Build tree: parents = items with no parent_menu_id
    const parents = [];
    for (const menu of menuMap.values()) {
        if (menu.parent_menu_id === null) {
            parents.push({
                menu_id: menu.menu_id,
                menu_name: menu.menu_name,
                priority: menu.priority,
                children: []
            });
        }
    }
    parents.sort((a, b) => a.priority - b.priority);

    // Assign children to their parents
    for (const menu of menuMap.values()) {
        if (menu.parent_menu_id !== null) {
            const parent = parents.find(p => p.menu_id === menu.parent_menu_id);
            if (parent) {
                parent.children.push({
                    menu_id: menu.menu_id,
                    menu_name: menu.menu_name,
                    priority: menu.priority,
                    actions: menu.actions
                });
            }
        }
    }

    // Sort children by priority
    for (const parent of parents) {
        parent.children.sort((a, b) => a.priority - b.priority);
    }

    // Re-sort parents after building tree
    parents.sort((a, b) => (a.priority || 999) - (b.priority || 999));

    return parents;
};


module.exports = {
    getAdmins,
    getRules,
    deleteRules,
    addRule,
    getMenuTree
};
