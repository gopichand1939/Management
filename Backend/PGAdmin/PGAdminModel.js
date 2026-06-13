const pool = require("../Config/Database");

const createPgAdmin = async (data) => {
    const query = `
        INSERT INTO pg_admin (
            institution_id,
            pg_admin_name,
            email,
            phone,
            password,
            created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            institution_id,
            pg_admin_name,
            email,
            phone,
            status,
            created_by,
            created_at
    `;

    const values = [
        data.institution_id,
        data.pg_admin_name,
        data.email,
        data.phone || null,
        data.password,
        data.created_by || null,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const findPgAdminByEmail = async (email) => {
    const query = `
        SELECT
            id,
            institution_id,
            pg_admin_name,
            email,
            phone,
            password,
            status,
            created_at
        FROM pg_admin
        WHERE email = $1
    `;

    const values = [email];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const getPgAdminList = async () => {
    const query = `
        SELECT
            pg_admin.id,
            pg_admin.institution_id,
            institutions.institution_name,
            pg_admin.pg_admin_name,
            pg_admin.email,
            pg_admin.phone,
            pg_admin.status,
            pg_admin.created_by,
            pg_admin.created_at
        FROM pg_admin
        INNER JOIN institutions
            ON institutions.id = pg_admin.institution_id
        ORDER BY pg_admin.id DESC
    `;

    const result = await pool.query(query);

    return result.rows;
};

const getPgAdminByInstitution = async (institutionId) => {
    const query = `
        SELECT
            pg_admin.id,
            pg_admin.institution_id,
            institutions.institution_name,
            pg_admin.pg_admin_name,
            pg_admin.email,
            pg_admin.phone,
            pg_admin.status,
            pg_admin.created_by,
            pg_admin.created_at
        FROM pg_admin
        INNER JOIN institutions
            ON institutions.id = pg_admin.institution_id
        WHERE pg_admin.institution_id = $1
        ORDER BY pg_admin.id DESC
    `;

    const values = [institutionId];

    const result = await pool.query(query, values);

    return result.rows;
};

const getInstitutionDropdownList = async () => {
    const query = `
        SELECT
            id,
            institution_name
        FROM institutions
        WHERE status = 'active'
        ORDER BY institution_name ASC
    `;

    const result = await pool.query(query);

    return result.rows;
};

const getInstitutionById = async (institutionId) => {
    const query = `
        SELECT *
        FROM institutions
        WHERE id = $1
    `;

    const values = [institutionId];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const findPgAdminById = async (id) => {
    const query = `
        SELECT
            pg_admin.id,
            pg_admin.institution_id,
            institutions.institution_name,
            pg_admin.pg_admin_name,
            pg_admin.email,
            pg_admin.phone,
            pg_admin.status,
            pg_admin.created_by,
            pg_admin.created_at
        FROM pg_admin
        INNER JOIN institutions
            ON institutions.id = pg_admin.institution_id
        WHERE pg_admin.id = $1
    `;

    const values = [id];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const updatePgAdmin = async (data) => {
    const query = `
        UPDATE pg_admin
        SET
            institution_id = $1,
            pg_admin_name = $2,
            email = $3,
            phone = $4,
            status = $5
        WHERE id = $6
        RETURNING *
    `;

    const values = [
        data.institution_id,
        data.pg_admin_name,
        data.email,
        data.phone || null,
        data.status || "active",
        data.id,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const deletePgAdminById = async (id) => {
    const query = `
        DELETE FROM pg_admin
        WHERE id = $1
        RETURNING *
    `;

    const values = [id];

    const result = await pool.query(query, values);

    return result.rows[0];
};

module.exports = {
    createPgAdmin,
    deletePgAdminById,
    findPgAdminByEmail,
    findPgAdminById,
    getInstitutionById,
    getInstitutionDropdownList,
    getPgAdminList,
    getPgAdminByInstitution,
    updatePgAdmin,
};
