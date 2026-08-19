const pool = require("../Config/Database");

const createUserCredential = async (data) => {
    const query = `
        INSERT INTO user_credentials (
            email,
            password,
            role,
            institution_id,
            super_admin_id,
            pg_admin_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            email,
            role,
            institution_id,
            super_admin_id,
            pg_admin_id,
            created_at
    `;

    const values = [
        data.email,
        data.password,
        data.role,
        data.institution_id || null,
        data.super_admin_id || null,
        data.pg_admin_id || null,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const findUserCredentialByEmail = async (email) => {
    const query = `
        SELECT
            id,
            email,
            password,
            role,
            institution_id,
            super_admin_id,
            pg_admin_id,
            created_at
        FROM user_credentials
        WHERE email = $1
    `;

    const result = await pool.query(query, [email]);

    return result.rows[0];
};

const updateUserCredentialByPgAdminId = async (data) => {
    const query = `
        UPDATE user_credentials
        SET
            email = $1,
            institution_id = $2
        WHERE pg_admin_id = $3
        RETURNING
            id,
            email,
            role,
            institution_id,
            super_admin_id,
            pg_admin_id,
            created_at
    `;

    const values = [
        data.email,
        data.institution_id || null,
        data.pg_admin_id,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const deleteUserCredentialByPgAdminId = async (pgAdminId) => {
    const query = `
        DELETE FROM user_credentials
        WHERE pg_admin_id = $1
        RETURNING
            id,
            email,
            role,
            institution_id,
            super_admin_id,
            pg_admin_id,
            created_at
    `;

    const result = await pool.query(query, [pgAdminId]);

    return result.rows[0];
};

const deleteUserCredentialBySuperAdminId = async (superAdminId) => {
    const query = `
        DELETE FROM user_credentials
        WHERE super_admin_id = $1
        RETURNING
            id,
            email,
            role,
            institution_id,
            super_admin_id,
            pg_admin_id,
            created_at
    `;

    const result = await pool.query(query, [superAdminId]);

    return result.rows[0];
};

const reuseOrphanedCredential = async (email, password, role, institutionId, superAdminId, pgAdminId) => {
    const query = `
        UPDATE user_credentials
        SET
            password = $1,
            role = $2,
            institution_id = $3,
            super_admin_id = $4,
            pg_admin_id = $5
        WHERE email = $6
        RETURNING *
    `;
    const values = [
        password,
        role,
        institutionId || null,
        superAdminId || null,
        pgAdminId || null,
        email
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
};

module.exports = {
    createUserCredential,
    deleteUserCredentialByPgAdminId,
    deleteUserCredentialBySuperAdminId,
    findUserCredentialByEmail,
    updateUserCredentialByPgAdminId,
    reuseOrphanedCredential,
};
