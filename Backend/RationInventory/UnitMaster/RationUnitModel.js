const pool = require("../../Config/Database");

const RationUnitModel = {
    createRationUnit: async (
        institutionId,
        pgAdminId,
        unitName,
        unitCode,
        allowDecimal,
        description,
        status,
        createdBy
    ) => {
        try {
            const query = `
                INSERT INTO ration_units (
                    institution_id,
                    pg_admin_id,
                    unit_name,
                    unit_code,
                    allow_decimal,
                    description,
                    status,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    unit_name,
                    unit_code,
                    allow_decimal,
                    description,
                    status,
                    created_by,
                    created_at,
                    updated_at
            `;

            const values = [
                institutionId,
                pgAdminId || null,
                unitName,
                unitCode,
                allowDecimal !== undefined ? allowDecimal : true,
                description || null,
                status || "active",
                createdBy || null,
            ];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getRationUnitList: async (institutionId, limit, offset) => {
        try {
            let query = `
                SELECT
                    id,
                    institution_id,
                    pg_admin_id,
                    unit_name,
                    unit_code,
                    allow_decimal,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                FROM ration_units
                WHERE institution_id = $1
                ORDER BY id DESC
            `;

            const values = [institutionId];

            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $2 OFFSET $3`;
                values.push(limit, offset);
            }

            const result = await pool.query(query, values);

            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getRationUnitCount: async (institutionId) => {
        try {
            const query = `
                SELECT COUNT(*)::integer as count
                FROM ration_units
                WHERE institution_id = $1
            `;
            const result = await pool.query(query, [institutionId]);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getRationUnitById: async (id, institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    institution_id,
                    pg_admin_id,
                    unit_name,
                    unit_code,
                    allow_decimal,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                FROM ration_units
                WHERE id = $1
                AND institution_id = $2
            `;

            const values = [id, institutionId];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationUnitByName: async (unitName, institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    institution_id,
                    unit_name
                FROM ration_units
                WHERE LOWER(unit_name) = LOWER($1)
                AND institution_id = $2
            `;

            const values = [unitName, institutionId];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationUnitByCode: async (unitCode, institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    institution_id,
                    unit_code
                FROM ration_units
                WHERE LOWER(unit_code) = LOWER($1)
                AND institution_id = $2
            `;

            const values = [unitCode, institutionId];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    updateRationUnit: async (
        id,
        institutionId,
        unitName,
        unitCode,
        allowDecimal,
        description,
        status,
        updatedBy
    ) => {
        try {
            const query = `
                UPDATE ration_units
                SET
                    unit_name = $1,
                    unit_code = $2,
                    allow_decimal = $3,
                    description = $4,
                    status = $5,
                    updated_by = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                AND institution_id = $8
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    unit_name,
                    unit_code,
                    allow_decimal,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
            `;

            const values = [
                unitName,
                unitCode,
                allowDecimal !== undefined ? allowDecimal : true,
                description || null,
                status || "active",
                updatedBy || null,
                id,
                institutionId,
            ];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    deleteRationUnit: async (id, institutionId) => {
        try {
            const query = `
                DELETE FROM ration_units
                WHERE id = $1
                AND institution_id = $2
                RETURNING
                    id,
                    institution_id,
                    unit_name,
                    unit_code
            `;

            const values = [id, institutionId];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getUnitDropdownList: async (institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    unit_name,
                    unit_code,
                    allow_decimal
                FROM ration_units
                WHERE institution_id = $1
                AND status = 'active'
                ORDER BY unit_name ASC
            `;
            const result = await pool.query(query, [institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = RationUnitModel;
