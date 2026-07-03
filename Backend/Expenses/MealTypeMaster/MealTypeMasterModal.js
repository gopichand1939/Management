const pool = require("../../Config/Database");

const createMealType = async (data) => {
    try {
        const query = `
            INSERT INTO meal_type_master (
                institution_id,
                meal_type_name,
                meal_type_code,
                display_order,
                start_time,
                end_time,
                description,
                is_active,
                is_deleted,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9)
            RETURNING *
        `;

        const values = [
            data.institution_id,
            data.meal_type_name,
            data.meal_type_code,
            data.display_order,
            data.start_time,
            data.end_time,
            data.description,
            data.is_active,
            data.created_by,
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const getMealTypeList = async (institutionId) => {
    try {
        const values = [];
        const whereConditions = ["is_deleted = false"];

        if (institutionId) {
            values.push(institutionId);
            whereConditions.push(`institution_id = $${values.length}`);
        }

        const query = `
            SELECT *
            FROM meal_type_master
            WHERE ${whereConditions.join(" AND ")}
            ORDER BY display_order ASC, id DESC
        `;

        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

const getActiveMealTypeList = async (institutionId) => {
    try {
        const values = [];
        const whereConditions = [
            "is_active = true",
            "is_deleted = false",
        ];

        if (institutionId) {
            values.push(institutionId);
            whereConditions.push(`institution_id = $${values.length}`);
        }

        const query = `
            SELECT *
            FROM meal_type_master
            WHERE ${whereConditions.join(" AND ")}
            ORDER BY display_order ASC, id ASC
        `;

        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

const findMealTypeById = async (id, institutionId) => {
    try {
        const values = [id];
        const whereConditions = [
            "id = $1",
            "is_deleted = false",
        ];

        if (institutionId) {
            values.push(institutionId);
            whereConditions.push(`institution_id = $${values.length}`);
        }

        const query = `
            SELECT *
            FROM meal_type_master
            WHERE ${whereConditions.join(" AND ")}
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const updateMealType = async (data) => {
    try {
        const values = [
            data.meal_type_name,
            data.meal_type_code,
            data.display_order,
            data.start_time,
            data.end_time,
            data.description,
            data.is_active,
            data.updated_by,
            data.id,
        ];
        const whereConditions = [
            `id = $${values.length}`,
            "is_deleted = false",
        ];

        if (data.institution_id) {
            values.push(data.institution_id);
            whereConditions.push(`institution_id = $${values.length}`);
        }

        const query = `
            UPDATE meal_type_master
            SET
                meal_type_name = $1,
                meal_type_code = $2,
                display_order = $3,
                start_time = $4,
                end_time = $5,
                description = $6,
                is_active = $7,
                updated_by = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE ${whereConditions.join(" AND ")}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const updateMealTypeStatus = async (id, institutionId, isActive, updatedBy) => {
    try {
        const values = [isActive, updatedBy, id];
        const whereConditions = [
            `id = $${values.length}`,
            "is_deleted = false",
        ];

        if (institutionId) {
            values.push(institutionId);
            whereConditions.push(`institution_id = $${values.length}`);
        }

        const query = `
            UPDATE meal_type_master
            SET
                is_active = $1,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE ${whereConditions.join(" AND ")}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const deleteMealTypeById = async (id, institutionId, updatedBy) => {
    try {
        const values = [updatedBy, id];
        const whereConditions = [
            `id = $${values.length}`,
            "is_deleted = false",
        ];

        if (institutionId) {
            values.push(institutionId);
            whereConditions.push(`institution_id = $${values.length}`);
        }

        const query = `
            UPDATE meal_type_master
            SET
                is_deleted = true,
                is_active = false,
                updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE ${whereConditions.join(" AND ")}
            RETURNING *
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createMealType,
    getMealTypeList,
    getActiveMealTypeList,
    findMealTypeById,
    updateMealType,
    updateMealTypeStatus,
    deleteMealTypeById,
};
