const db = require("../Config/Database");

const getAdmins = async (institutionId = null) => {
    const values = [];
    let whereClause = "";
    if (institutionId && institutionId !== "all") {
        values.push(Number(institutionId));
        whereClause = `WHERE p.institution_id = $1`;
    }
    const sql = `
        SELECT 
            p.id,
            p.pg_admin_name AS name,
            p.email,
            p.phone,
            p.institution_id,
            i.institution_name AS institution
        FROM pg_admin p
        LEFT JOIN institutions i 
            ON i.id = p.institution_id
        ${whereClause}
        ORDER BY p.id ASC
    `;
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

module.exports = {
    getAdmins,
    getRules,
    deleteRules,
    addRule
};
