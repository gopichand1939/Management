const pool = require("../../Config/Database");

const getActiveInstitutionMealTypes = async (institutionId) => {
    try {
        const query = `
            SELECT
                id,
                institution_id,
                meal_type_name,
                meal_type_code,
                display_order,
                start_time,
                end_time
            FROM meal_type_master
            WHERE institution_id = $1
              AND is_active = true
              AND is_deleted = false
            ORDER BY display_order ASC, id ASC
        `;

        const result = await pool.query(query, [institutionId]);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

const getWeeklyFoodMenuList = async (institutionId) => {
    try {
        const query = `
            SELECT
                weekly_food_menu_config.id,
                weekly_food_menu_config.institution_id,
                weekly_food_menu_config.day_name,
                weekly_food_menu_config.day_order,
                weekly_food_menu_config.meal_type_id,
                weekly_food_menu_config.food_items,
                weekly_food_menu_config.is_active,
                weekly_food_menu_config.created_by,
                weekly_food_menu_config.created_at,
                weekly_food_menu_config.updated_by,
                weekly_food_menu_config.updated_at,
                meal_type_master.meal_type_name,
                meal_type_master.meal_type_code,
                meal_type_master.display_order
            FROM weekly_food_menu_config
            INNER JOIN meal_type_master
                ON meal_type_master.id = weekly_food_menu_config.meal_type_id
            WHERE weekly_food_menu_config.institution_id = $1
              AND weekly_food_menu_config.is_deleted = false
              AND meal_type_master.is_active = true
              AND meal_type_master.is_deleted = false
            ORDER BY weekly_food_menu_config.day_order ASC, meal_type_master.display_order ASC
        `;

        const result = await pool.query(query, [institutionId]);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

const saveWeeklyFoodMenus = async (institutionId, menus, userId) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const savedMenus = [];

        for (const menu of menus) {
            const existingQuery = `
                SELECT id
                FROM weekly_food_menu_config
                WHERE institution_id = $1
                  AND day_order = $2
                  AND meal_type_id = $3
                  AND is_deleted = false
            `;

            const existingResult = await client.query(existingQuery, [
                institutionId,
                menu.day_order,
                menu.meal_type_id,
            ]);

            if (existingResult.rows[0]) {
                const updateQuery = `
                    UPDATE weekly_food_menu_config
                    SET
                        day_name = $1,
                        food_items = $2,
                        is_active = true,
                        updated_by = $3,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                    RETURNING *
                `;

                const updateResult = await client.query(updateQuery, [
                    menu.day_name,
                    menu.food_items,
                    userId,
                    existingResult.rows[0].id,
                ]);

                savedMenus.push(updateResult.rows[0]);
                continue;
            }

            const insertQuery = `
                INSERT INTO weekly_food_menu_config (
                    institution_id,
                    day_name,
                    day_order,
                    meal_type_id,
                    food_items,
                    is_active,
                    is_deleted,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, true, false, $6)
                RETURNING *
            `;

            const insertResult = await client.query(insertQuery, [
                institutionId,
                menu.day_name,
                menu.day_order,
                menu.meal_type_id,
                menu.food_items,
                userId,
            ]);

            savedMenus.push(insertResult.rows[0]);
        }

        await client.query("COMMIT");
        return savedMenus;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const findWeeklyFoodMenuById = async (id) => {
    try {
        const query = `
            SELECT *
            FROM weekly_food_menu_config
            WHERE id = $1
              AND is_deleted = false
        `;

        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

const deleteWeeklyFoodMenuById = async (id, institutionId, updatedBy) => {
    try {
        const query = `
            UPDATE weekly_food_menu_config
            SET
                is_deleted = true,
                is_active = false,
                updated_by = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
              AND institution_id = $3
              AND is_deleted = false
            RETURNING *
        `;

        const result = await pool.query(query, [updatedBy, id, institutionId]);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getActiveInstitutionMealTypes,
    getWeeklyFoodMenuList,
    saveWeeklyFoodMenus,
    findWeeklyFoodMenuById,
    deleteWeeklyFoodMenuById,
};
