const db = require("../Config/Database");

// Auto-verify and create table daily_meal_actual_stats
const initStatsTable = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS daily_meal_actual_stats (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
                meal_date DATE NOT NULL,
                breakfast_cooked VARCHAR(100) DEFAULT '0',
                breakfast_left VARCHAR(100) DEFAULT '0',
                lunch_cooked VARCHAR(100) DEFAULT '0',
                lunch_left VARCHAR(100) DEFAULT '0',
                dinner_cooked VARCHAR(100) DEFAULT '0',
                dinner_left VARCHAR(100) DEFAULT '0',
                actual_daily_expense NUMERIC(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT daily_meal_actual_stats_inst_date_unique UNIQUE (institution_id, meal_date)
            );
        `);

        // Migration query to update existing columns to VARCHAR and add actual_daily_expense if table already existed
        await db.query(`
            ALTER TABLE daily_meal_actual_stats ALTER COLUMN breakfast_cooked TYPE VARCHAR(100);
            ALTER TABLE daily_meal_actual_stats ALTER COLUMN breakfast_left TYPE VARCHAR(100);
            ALTER TABLE daily_meal_actual_stats ALTER COLUMN lunch_cooked TYPE VARCHAR(100);
            ALTER TABLE daily_meal_actual_stats ALTER COLUMN lunch_left TYPE VARCHAR(100);
            ALTER TABLE daily_meal_actual_stats ALTER COLUMN dinner_cooked TYPE VARCHAR(100);
            ALTER TABLE daily_meal_actual_stats ALTER COLUMN dinner_left TYPE VARCHAR(100);
            ALTER TABLE daily_meal_actual_stats ADD COLUMN IF NOT EXISTS actual_daily_expense NUMERIC(10,2);
        `);
    } catch (err) {
        console.error("Error creating/altering daily_meal_actual_stats table:", err);
    }
};
initStatsTable();


/**
 * Finds an active tenant by their registered phone number
 */
const findActiveTenantByPhone = async (phone, institutionId) => {
    const queryStr = `
        SELECT t.*, r.room_number, f.floor_name 
        FROM tenants t
        LEFT JOIN rooms r ON t.room_id = r.id
        LEFT JOIN floors f ON t.floor_id = f.id
        WHERE t.phone = $1 
          AND t.institution_id = $2 
          AND t.status = 'active' 
          AND t.deleted_at IS NULL
        LIMIT 1
    `;
    const result = await db.query(queryStr, [phone.trim(), institutionId]);
    return result.rows[0];
};

/**
 * Gets meal count statistics for a date
 */
const getMealCountsSummary = async (institutionId, date) => {
    const totalActiveQuery = `
        SELECT COUNT(*)::int AS count 
        FROM tenants 
        WHERE institution_id = $1 
          AND status = 'active' 
          AND deleted_at IS NULL
    `;

    const countsQuery = `
        SELECT 
            SUM(CASE WHEN COALESCE(m.breakfast, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int AS breakfast_taking,
            SUM(CASE WHEN COALESCE(m.lunch, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int AS lunch_taking,
            SUM(CASE WHEN COALESCE(m.dinner, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int AS dinner_taking,
            SUM(CASE WHEN m.full_day_leave = TRUE THEN 1 ELSE 0 END)::int AS full_day_leave,
            SUM(CASE WHEN m.vacation = TRUE THEN 1 ELSE 0 END)::int AS vacation,
            SUM(
                (CASE WHEN COALESCE(m.breakfast, 'taking') = 'skipping' OR COALESCE(m.full_day_leave, FALSE) = TRUE OR COALESCE(m.vacation, FALSE) = TRUE THEN 1 ELSE 0 END) +
                (CASE WHEN COALESCE(m.lunch, 'taking') = 'skipping' OR COALESCE(m.full_day_leave, FALSE) = TRUE OR COALESCE(m.vacation, FALSE) = TRUE THEN 1 ELSE 0 END) +
                (CASE WHEN COALESCE(m.dinner, 'taking') = 'skipping' OR COALESCE(m.full_day_leave, FALSE) = TRUE OR COALESCE(m.vacation, FALSE) = TRUE THEN 1 ELSE 0 END)
            )::int AS skipped_meals
        FROM tenants t
        LEFT JOIN daily_meal_tracker m ON t.id = m.tenant_id AND m.meal_date = $2
        WHERE t.institution_id = $1 
          AND t.status = 'active' 
          AND t.deleted_at IS NULL
    `;

    const totalActiveRes = await db.query(totalActiveQuery, [institutionId]);
    const countsRes = await db.query(countsQuery, [institutionId, date]);

    const totalActive = totalActiveRes.rows[0]?.count || 0;
    const counts = countsRes.rows[0] || {
        breakfast_taking: 0,
        lunch_taking: 0,
        dinner_taking: 0,
        full_day_leave: 0,
        vacation: 0,
        skipped_meals: 0
    };

    const actualStatsRes = await db.query(`
        SELECT breakfast_cooked, breakfast_left, lunch_cooked, lunch_left, dinner_cooked, dinner_left, actual_daily_expense
        FROM daily_meal_actual_stats
        WHERE institution_id = $1 AND meal_date = $2
    `, [institutionId, date]);

    const actual = actualStatsRes.rows[0];

    const kitchenPrepCount = counts.breakfast_taking + counts.lunch_taking + counts.dinner_taking;

    return {
        totalActiveTenants: totalActive,
        breakfastCount: counts.breakfast_taking,
        lunchCount: counts.lunch_taking,
        dinnerCount: counts.dinner_taking,
        fullDayLeaveCount: counts.full_day_leave,
        vacationCount: counts.vacation,
        skippedMealsCount: counts.skipped_meals,
        kitchenPrepCount: kitchenPrepCount,
        breakfastCooked: actual ? actual.breakfast_cooked : String(counts.breakfast_taking),
        breakfastLeft: actual ? actual.breakfast_left : "0",
        lunchCooked: actual ? actual.lunch_cooked : String(counts.lunch_taking),
        lunchLeft: actual ? actual.lunch_left : "0",
        dinnerCooked: actual ? actual.dinner_cooked : String(counts.dinner_taking),
        dinnerLeft: actual ? actual.dinner_left : "0",
        actualDailyExpense: actual ? actual.actual_daily_expense : null,
        hasActualStats: !!actual
    };
};

/**
 * Lists active tenants and their meal records with filters
 */
const listActiveTenantsWithMeals = async (institutionId, date, filters = {}) => {
    let queryStr = `
        SELECT 
            t.id AS tenant_id,
            t.full_name,
            t.phone,
            r.room_number,
            t.room_id,
            f.floor_name,
            t.floor_id,
            m.id AS record_id,
            COALESCE(m.breakfast, 'taking') AS breakfast,
            COALESCE(m.lunch, 'taking') AS lunch,
            COALESCE(m.dinner, 'taking') AS dinner,
            COALESCE(m.full_day_leave, FALSE) AS full_day_leave,
            COALESCE(m.vacation, FALSE) AS vacation,
            m.reason,
            m.meal_date
        FROM tenants t
        LEFT JOIN rooms r ON t.room_id = r.id
        LEFT JOIN floors f ON t.floor_id = f.id
        LEFT JOIN daily_meal_tracker m ON t.id = m.tenant_id AND m.meal_date = $2
        WHERE t.institution_id = $1 
          AND t.status = 'active' 
          AND t.deleted_at IS NULL
    `;

    const queryParams = [institutionId, date];
    let paramIndex = 3;

    if (filters.roomId) {
        queryStr += ` AND t.room_id = $${paramIndex++}`;
        queryParams.push(filters.roomId);
    }
    if (filters.floorId) {
        queryStr += ` AND t.floor_id = $${paramIndex++}`;
        queryParams.push(filters.floorId);
    }
    if (filters.searchText) {
        queryStr += ` AND (t.full_name ILIKE $${paramIndex} OR t.phone ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.searchText.trim()}%`);
        paramIndex++;
    }

    queryStr += ` ORDER BY (m.id IS NULL) ASC, m.updated_at ASC, f.floor_number ASC, r.room_number ASC, t.full_name ASC`;

    const result = await db.query(queryStr, queryParams);
    return result.rows;
};

/**
 * Saves or updates a single meal tracker record
 */
const saveMealRecord = async (record) => {
    const queryStr = `
        INSERT INTO daily_meal_tracker (
            institution_id, tenant_id, meal_date, breakfast, lunch, dinner, 
            full_day_leave, vacation, reason, created_by, updated_by, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (tenant_id, meal_date) 
        DO UPDATE SET
            breakfast = EXCLUDED.breakfast,
            lunch = EXCLUDED.lunch,
            dinner = EXCLUDED.dinner,
            full_day_leave = EXCLUDED.full_day_leave,
            vacation = EXCLUDED.vacation,
            reason = EXCLUDED.reason,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    const {
        institutionId,
        tenantId,
        mealDate,
        breakfast,
        lunch,
        dinner,
        fullDayLeave,
        vacation,
        reason,
        userId
    } = record;

    // Apply rule: vacation or leave automatically skips all meals
    const isSkipped = fullDayLeave || vacation;
    const finalBreakfast = isSkipped ? "skipping" : (breakfast || "taking");
    const finalLunch = isSkipped ? "skipping" : (lunch || "taking");
    const finalDinner = isSkipped ? "skipping" : (dinner || "taking");

    const params = [
        institutionId,
        tenantId,
        mealDate,
        finalBreakfast,
        finalLunch,
        finalDinner,
        !!fullDayLeave,
        !!vacation,
        reason || null,
        userId || null
    ];

    const result = await db.query(queryStr, params);
    return result.rows[0];
};

/**
 * Bulk updates meal tracker records
 */
const saveBulkMealRecords = async (records, institutionId, userId) => {
    return await db.transaction(async (client) => {
        const savedRecords = [];
        const queryStr = `
            INSERT INTO daily_meal_tracker (
                institution_id, tenant_id, meal_date, breakfast, lunch, dinner, 
                full_day_leave, vacation, reason, created_by, updated_by, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, CURRENT_TIMESTAMP)
            ON CONFLICT (tenant_id, meal_date) 
            DO UPDATE SET
                breakfast = EXCLUDED.breakfast,
                lunch = EXCLUDED.lunch,
                dinner = EXCLUDED.dinner,
                full_day_leave = EXCLUDED.full_day_leave,
                vacation = EXCLUDED.vacation,
                reason = EXCLUDED.reason,
                updated_by = EXCLUDED.updated_by,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        for (const record of records) {
            const isSkipped = record.full_day_leave || record.vacation;
            const finalBreakfast = isSkipped ? "skipping" : (record.breakfast || "taking");
            const finalLunch = isSkipped ? "skipping" : (record.lunch || "taking");
            const finalDinner = isSkipped ? "skipping" : (record.dinner || "taking");

            const params = [
                institutionId,
                record.tenant_id,
                record.meal_date,
                finalBreakfast,
                finalLunch,
                finalDinner,
                !!record.full_day_leave,
                !!record.vacation,
                record.reason || null,
                userId || null
            ];

            const result = await client.query(queryStr, params);
            savedRecords.push(result.rows[0]);
        }
        return savedRecords;
    });
};

/**
 * Gets meal history for a specific tenant
 */
const getTenantMealHistory = async (tenantId) => {
    const queryStr = `
        SELECT * 
        FROM daily_meal_tracker 
        WHERE tenant_id = $1 
        ORDER BY meal_date DESC 
        LIMIT 30
    `;
    const result = await db.query(queryStr, [tenantId]);
    return result.rows;
};

/**
 * Gets a monthly report of meal consumptions for all active tenants
 */
const getMonthlyMealReport = async (institutionId, year, month) => {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Last day of month

    const queryStr = `
        SELECT 
            t.id AS tenant_id,
            t.full_name,
            r.room_number,
            COUNT(m.id)::int AS total_records,
            SUM(CASE WHEN COALESCE(m.breakfast, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int AS breakfast_taken,
            SUM(CASE WHEN COALESCE(m.lunch, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int AS lunch_taken,
            SUM(CASE WHEN COALESCE(m.dinner, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int AS dinner_taken,
            SUM(CASE WHEN m.full_day_leave = TRUE OR m.vacation = TRUE THEN 1 ELSE 0 END)::int AS leave_days
        FROM tenants t
        LEFT JOIN rooms r ON t.room_id = r.id
        LEFT JOIN daily_meal_tracker m ON t.id = m.tenant_id AND m.meal_date BETWEEN $2 AND $3
        WHERE t.institution_id = $1 
          AND t.status = 'active' 
          AND t.deleted_at IS NULL
        GROUP BY t.id, t.full_name, r.room_number
        ORDER BY r.room_number ASC, t.full_name ASC
    `;

    const result = await db.query(queryStr, [institutionId, startDate, endDate]);
    return result.rows;
};

/**
 * Saves actual cooked and leftover meal statistics for a date
 */
const saveActualStats = async (stats) => {
    const {
        institutionId,
        mealDate,
        breakfastCooked,
        breakfastLeft,
        lunchCooked,
        lunchLeft,
        dinnerCooked,
        dinnerLeft,
        actualDailyExpense
    } = stats;

    const queryStr = `
        INSERT INTO daily_meal_actual_stats (
            institution_id, meal_date, 
            breakfast_cooked, breakfast_left, 
            lunch_cooked, lunch_left, 
            dinner_cooked, dinner_left,
            actual_daily_expense,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        ON CONFLICT (institution_id, meal_date)
        DO UPDATE SET
            breakfast_cooked = EXCLUDED.breakfast_cooked,
            breakfast_left = EXCLUDED.breakfast_left,
            lunch_cooked = EXCLUDED.lunch_cooked,
            lunch_left = EXCLUDED.lunch_left,
            dinner_cooked = EXCLUDED.dinner_cooked,
            dinner_left = EXCLUDED.dinner_left,
            actual_daily_expense = EXCLUDED.actual_daily_expense,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    const result = await db.query(queryStr, [
        institutionId,
        mealDate,
        breakfastCooked !== undefined ? String(breakfastCooked) : '0',
        breakfastLeft !== undefined ? String(breakfastLeft) : '0',
        lunchCooked !== undefined ? String(lunchCooked) : '0',
        lunchLeft !== undefined ? String(lunchLeft) : '0',
        dinnerCooked !== undefined ? String(dinnerCooked) : '0',
        dinnerLeft !== undefined ? String(dinnerLeft) : '0',
        actualDailyExpense !== undefined && actualDailyExpense !== null && actualDailyExpense !== "" ? parseFloat(actualDailyExpense) : null
    ]);
    return result.rows[0];
};

/**
 * Gets a day-wise report of meal statistics for a range of dates
 */
const getDayWiseMealReport = async (institutionId, startDate, endDate) => {
    const queryStr = `
        SELECT 
            d.date::date AS meal_date,
            (SELECT COUNT(*)::int FROM tenants WHERE institution_id = $1 AND status = 'active' AND deleted_at IS NULL) AS total_active_tenants,
            COALESCE(
                s.breakfast_cooked,
                COALESCE(SUM(CASE WHEN COALESCE(m.breakfast, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int, 0)::text
            ) AS breakfast_cooked,
            COALESCE(
                s.breakfast_left,
                '0'
            ) AS breakfast_left,
            COALESCE(
                s.lunch_cooked,
                COALESCE(SUM(CASE WHEN COALESCE(m.lunch, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int, 0)::text
            ) AS lunch_cooked,
            COALESCE(
                s.lunch_left,
                '0'
            ) AS lunch_left,
            COALESCE(
                s.dinner_cooked,
                COALESCE(SUM(CASE WHEN COALESCE(m.dinner, 'taking') = 'taking' AND COALESCE(m.full_day_leave, FALSE) = FALSE AND COALESCE(m.vacation, FALSE) = FALSE THEN 1 ELSE 0 END)::int, 0)::text
            ) AS dinner_cooked,
            COALESCE(
                s.dinner_left,
                '0'
            ) AS dinner_left,
            s.actual_daily_expense
        FROM (
            SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS date
        ) d
        CROSS JOIN tenants t
        LEFT JOIN daily_meal_tracker m ON m.tenant_id = t.id AND m.meal_date = d.date
        LEFT JOIN daily_meal_actual_stats s ON s.institution_id = $1 AND s.meal_date = d.date
        WHERE t.institution_id = $1
          AND t.status = 'active'
          AND t.deleted_at IS NULL
        GROUP BY d.date, s.breakfast_cooked, s.breakfast_left, s.lunch_cooked, s.lunch_left, s.dinner_cooked, s.dinner_left, s.actual_daily_expense
        ORDER BY d.date DESC
    `;

    const result = await db.query(queryStr, [institutionId, startDate, endDate]);
    return result.rows;
};

const startDailyAutoSaveJob = () => {
    // Check every minute
    setInterval(async () => {
        try {
            const now = new Date();
            // Convert current UTC time to local IST (UTC+5:30) time:
            const istTime = new Date(now.getTime() + (330 * 60 * 1000));
            const currentHour = istTime.getUTCHours();
            const currentMinute = istTime.getUTCMinutes();

            // Run auto-save at 22:00 (10:00 PM) IST
            if (currentHour === 22 && currentMinute === 0) {
                console.log("[AutoSave Job] Running daily 10 PM IST auto-save...");
                
                const year = istTime.getUTCFullYear();
                const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
                const day = String(istTime.getUTCDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;

                // Fetch all institutions
                const institutionsRes = await db.query("SELECT id FROM institutions WHERE deleted_at IS NULL");

                for (const row of institutionsRes.rows) {
                    const instId = row.id;
                    
                    // Check if actual stats are already saved for today
                    const checkRes = await db.query(
                        "SELECT id FROM daily_meal_actual_stats WHERE institution_id = $1 AND meal_date = $2",
                        [instId, todayStr]
                    );

                    if (checkRes.rows.length === 0) {
                        // Get requested counts for today
                        const summary = await getMealCountsSummary(instId, todayStr);
                        // Save these counts as actual cooked, with 0 leftover
                        await saveActualStats({
                            institutionId: instId,
                            mealDate: todayStr,
                            breakfastCooked: String(summary.breakfastCount),
                            breakfastLeft: "0",
                            lunchCooked: String(summary.lunchCount),
                            lunchLeft: "0",
                            dinnerCooked: String(summary.dinnerCount),
                            dinnerLeft: "0",
                            actualDailyExpense: null
                        });
                        console.log(`[AutoSave Job] Auto-saved today's defaults for institution ${instId}`);
                    }
                }
            }
        } catch (err) {
            console.error("[AutoSave Job] Error running auto-save:", err);
        }
    }, 60000); // check every minute
};
startDailyAutoSaveJob();

module.exports = {
    findActiveTenantByPhone,
    getMealCountsSummary,
    listActiveTenantsWithMeals,
    saveMealRecord,
    saveBulkMealRecords,
    getTenantMealHistory,
    getMonthlyMealReport,
    saveActualStats,
    getDayWiseMealReport
};
