const pool = require("../../Config/Database");

const createDailyExpense = async (data) => {
    try {
        const query = `
            INSERT INTO daily_expenses_spend (
                institution_id,
                expense_title,
                category,
                amount,
                expense_date,
                expense_time,
                bill_file,
                is_deleted,
                created_by
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,false,$8)
            RETURNING *
        `;

        const values = [
            data.institution_id,
            data.expense_title,
            data.category,
            data.amount,
            data.expense_date,
            data.expense_time,
            JSON.stringify(data.bill_file || null),
            data.created_by,
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const getDailyExpenseList = async (institutionId) => {
    try {
        const values = [];
        const whereConditions = ["is_deleted = false"];

        if (institutionId) {
            values.push(institutionId);
            whereConditions.push(`institution_id = $${values.length}`);
        }

        const query = `
            SELECT *
            FROM daily_expenses_spend
            WHERE ${whereConditions.join(" AND ")}
            ORDER BY expense_date DESC, expense_time DESC NULLS LAST, id DESC
        `;

        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

const findDailyExpenseById = async (id, institutionId) => {
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
            FROM daily_expenses_spend
            WHERE ${whereConditions.join(" AND ")}
        `;

        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const updateDailyExpense = async (data) => {
    try {
        const values = [
            data.expense_title,
            data.category,
            data.amount,
            data.expense_date,
            data.expense_time,
            JSON.stringify(data.bill_file || null),
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
            UPDATE daily_expenses_spend
            SET
                expense_title = $1,
                category = $2,
                amount = $3,
                expense_date = $4,
                expense_time = $5,
                bill_file = $6::jsonb,
                updated_by = $7,
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

const deleteDailyExpenseById = async (id, institutionId, updatedBy) => {
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
            UPDATE daily_expenses_spend
            SET
                is_deleted = true,
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
    createDailyExpense,
    getDailyExpenseList,
    findDailyExpenseById,
    updateDailyExpense,
    deleteDailyExpenseById,
};
