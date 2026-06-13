const pool = require("../Config/Database");

const createSuperAdmin = async (
    name,
    email,
    phone,
    password,
    institutionId,
    pgAdminId
) => {
    try {
        const query = `
            INSERT INTO super_admins (
                institution_id,
                pg_admin_id,
                name,
                email,
                phone,
                password
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                institution_id,
                pg_admin_id,
                name,
                email,
                phone,
                role,
                created_at
        `;

        const values = [
            institutionId || null,
            pgAdminId || null,
            name,
            email,
            phone,
            password,
        ];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const findSuperAdminByEmail = async (email) => {
    try {
        const query = `
            SELECT
                id,
                institution_id,
                pg_admin_id,
                name,
                email,
                phone,
                password,
                role,
                created_at
            FROM super_admins
            WHERE email = $1
        `;

        const values = [email];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const findSuperAdminById = async (id) => {
    try {
        const query = `
            SELECT
                id,
                institution_id,
                pg_admin_id,
                name,
                email,
                phone,
                role,
                created_at
            FROM super_admins
            WHERE id = $1
        `;

        const values = [id];

        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const getRegisteredSuperAdminList = async () => {
    try {
        const query = `
            SELECT
                id,
                institution_id,
                pg_admin_id,
                name,
                email,
                phone,
                role,
                created_at
            FROM super_admins
            ORDER BY id DESC
        `;

        const result = await pool.query(query);

        return result.rows;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createSuperAdmin,
    findSuperAdminByEmail,
    findSuperAdminById,
    getRegisteredSuperAdminList,
};
