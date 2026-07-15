const pool = require("../../Config/Database");

const RationCategoryModel = {
    createRationCategory: async (
        institutionId,
        pgAdminId,
        categoryName,
        categoryCode,
        description,
        status,
        createdBy
    ) => {
        try {
            const query = `
                INSERT INTO ration_item_categories (
                    institution_id,
                    pg_admin_id,
                    category_name,
                    category_code,
                    description,
                    status,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    category_name,
                    category_code,
                    description,
                    status,
                    created_by,
                    created_at,
                    updated_at
            `;

            const values = [
                institutionId,
                pgAdminId || null,
                categoryName,
                categoryCode || null,
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

    getRationCategoryList: async (institutionId, limit, offset) => {
        try {
            let query = `
                SELECT
                    id,
                    institution_id,
                    pg_admin_id,
                    category_name,
                    category_code,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                FROM ration_item_categories
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

    getRationCategoryCount: async (institutionId) => {
        try {
            const query = `
                SELECT COUNT(*)::integer as count
                FROM ration_item_categories
                WHERE institution_id = $1
            `;
            const result = await pool.query(query, [institutionId]);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getRationCategoryById: async (id, institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    institution_id,
                    pg_admin_id,
                    category_name,
                    category_code,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
                FROM ration_item_categories
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

    findRationCategoryByName: async (
        categoryName,
        institutionId
    ) => {
        try {
            const query = `
                SELECT
                    id,
                    institution_id,
                    category_name
                FROM ration_item_categories
                WHERE LOWER(category_name) = LOWER($1)
                AND institution_id = $2
            `;

            const values = [categoryName, institutionId];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    findRationCategoryByCode: async (
        categoryCode,
        institutionId
    ) => {
        try {
            const query = `
                SELECT
                    id,
                    institution_id,
                    category_code
                FROM ration_item_categories
                WHERE LOWER(category_code) = LOWER($1)
                AND institution_id = $2
            `;

            const values = [categoryCode, institutionId];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    updateRationCategory: async (
        id,
        institutionId,
        categoryName,
        categoryCode,
        description,
        status,
        updatedBy
    ) => {
        try {
            const query = `
                UPDATE ration_item_categories
                SET
                    category_name = $1,
                    category_code = $2,
                    description = $3,
                    status = $4,
                    updated_by = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                AND institution_id = $7
                RETURNING
                    id,
                    institution_id,
                    pg_admin_id,
                    category_name,
                    category_code,
                    description,
                    status,
                    created_by,
                    updated_by,
                    created_at,
                    updated_at
            `;

            const values = [
                categoryName,
                categoryCode || null,
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

    deleteRationCategory: async (id, institutionId) => {
        try {
            const query = `
                DELETE FROM ration_item_categories
                WHERE id = $1
                AND institution_id = $2
                RETURNING
                    id,
                    institution_id,
                    category_name,
                    category_code
            `;

            const values = [id, institutionId];

            const result = await pool.query(query, values);

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    },

    getCategoryDropdownList: async (institutionId) => {
        try {
            const query = `
                SELECT
                    id,
                    category_name,
                    category_code
                FROM ration_item_categories
                WHERE institution_id = $1
                AND status = 'active'
                ORDER BY category_name ASC
            `;
            const result = await pool.query(query, [institutionId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = RationCategoryModel;