const pool = require("../Config/Database");
const { createTenantPayment } = require("../Tenant/TenantModel");

const normalizeInteger = (value) => {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isNaN(parsedValue) ? null : parsedValue;
};

const normalizeText = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    const text = String(value).trim();
    return text || null;
};

const ensurePaymentReminderSchema = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_reminder_actions (
            id SERIAL PRIMARY KEY,
            monthly_due_id INTEGER NOT NULL REFERENCES tenant_monthly_dues(id) ON DELETE CASCADE,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            action_type VARCHAR(50) NOT NULL DEFAULT 'follow_up',
            action_note TEXT,
            promise_date DATE,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS payment_reminder_actions_due_idx
        ON payment_reminder_actions(monthly_due_id, created_at DESC)
    `);
};

const syncPaymentReminderDueWindow = async (institutionId = null, windowDays = 30) => {
    const values = [normalizeInteger(windowDays) || 30];
    const institutionFilter = [];

    if (institutionId) {
        values.push(institutionId);
        institutionFilter.push(`AND tenants.institution_id = $${values.length}`);
    }

    await pool.query(`
        INSERT INTO tenant_monthly_dues (
            tenant_id,
            institution_id,
            due_month,
            due_date,
            cycle_start_date,
            cycle_end_date,
            total_rent,
            paid_amount,
            pending_amount,
            status
        )
        SELECT
            due_rows.tenant_id,
            due_rows.institution_id,
            due_rows.due_date,
            due_rows.due_date,
            due_rows.cycle_start_date,
            due_rows.cycle_end_date,
            due_rows.total_rent,
            0,
            due_rows.total_rent,
            'pending'
        FROM (
            SELECT
                tenants.id AS tenant_id,
                tenants.institution_id,
                CASE
                    WHEN tenants.billing_cycle_type = 'calendar_month_prorated'
                      AND month_offsets.month_index = 0
                        THEN tenants.check_in_date
                    WHEN tenants.billing_cycle_type = 'calendar_month_prorated'
                        THEN (DATE_TRUNC('month', tenants.check_in_date)::date + (month_offsets.month_index || ' month')::interval)::date
                    ELSE (tenants.check_in_date + (month_offsets.month_index || ' month')::interval)::date
                END AS due_date,
                CASE
                    WHEN tenants.billing_cycle_type = 'calendar_month_prorated'
                      AND month_offsets.month_index = 0
                        THEN tenants.check_in_date
                    WHEN tenants.billing_cycle_type = 'calendar_month_prorated'
                        THEN (DATE_TRUNC('month', tenants.check_in_date)::date + (month_offsets.month_index || ' month')::interval)::date
                    ELSE (tenants.check_in_date + (month_offsets.month_index || ' month')::interval)::date
                END AS cycle_start_date,
                CASE
                    WHEN tenants.billing_cycle_type = 'calendar_month_prorated'
                      AND month_offsets.month_index = 0
                        THEN (
                            DATE_TRUNC('month', tenants.check_in_date)::date
                            + INTERVAL '1 month'
                            - INTERVAL '1 day'
                        )::date
                    WHEN tenants.billing_cycle_type = 'calendar_month_prorated'
                        THEN (
                            DATE_TRUNC('month', tenants.check_in_date)::date
                            + ((month_offsets.month_index + 1) || ' month')::interval
                            - INTERVAL '1 day'
                        )::date
                    ELSE (
                        tenants.check_in_date
                        + ((month_offsets.month_index + 1) || ' month')::interval
                        - INTERVAL '1 day'
                    )::date
                END AS cycle_end_date,
                CASE
                    WHEN tenants.billing_cycle_type = 'calendar_month_prorated'
                      AND month_offsets.month_index = 0
                      AND tenants.first_cycle_amount > 0
                        THEN tenants.first_cycle_amount
                    ELSE tenants.agreed_monthly_rent
                END AS total_rent
            FROM tenants
            CROSS JOIN generate_series(0, 120) AS month_offsets(month_index)
            WHERE tenants.deleted_at IS NULL
              AND tenants.status IN ('active', 'notice_period', 'pending_verification')
              AND tenants.check_in_date IS NOT NULL
              AND tenants.agreed_monthly_rent > 0
              ${institutionFilter.join(" ")}
        ) AS due_rows
        WHERE due_rows.due_date <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
          AND due_rows.due_date >= due_rows.cycle_start_date
          AND NOT EXISTS (
              SELECT 1
              FROM tenant_monthly_dues existing_due
              WHERE existing_due.tenant_id = due_rows.tenant_id
                AND existing_due.due_month = due_rows.due_date
          )
    `, values);
};

const getPaymentReminders = async ({
    institutionId = null,
    search = "",
    status = "all",
    windowDays = 30,
}) => {
    await ensurePaymentReminderSchema();
    await syncPaymentReminderDueWindow(institutionId, windowDays);

    const values = [];
    const whereConditions = [
        "tenants.deleted_at IS NULL",
        "tenants.status IN ('active', 'notice_period', 'pending_verification')",
        "tenant_monthly_dues.pending_amount > 0",
    ];

    const normalizedWindowDays = normalizeInteger(windowDays) || 30;

    values.push(normalizedWindowDays);
    whereConditions.push(`
        tenant_monthly_dues.due_date <= CURRENT_DATE + ($${values.length}::int * INTERVAL '1 day')
    `);

    if (institutionId) {
        values.push(institutionId);
        whereConditions.push(`tenant_monthly_dues.institution_id = $${values.length}`);
    }

    if (status && status !== "all") {
        if (status === "overdue") {
            whereConditions.push("tenant_monthly_dues.due_date < CURRENT_DATE");
        } else if (status === "today") {
            whereConditions.push("tenant_monthly_dues.due_date = CURRENT_DATE");
        } else if (status === "upcoming") {
            whereConditions.push("tenant_monthly_dues.due_date > CURRENT_DATE");
        } else {
            values.push(status);
            whereConditions.push(`tenant_monthly_dues.status = $${values.length}`);
        }
    }

    if (search) {
        values.push(`%${String(search).trim().toLowerCase()}%`);
        whereConditions.push(`
            (
                LOWER(COALESCE(tenants.full_name, '')) LIKE $${values.length}
                OR LOWER(COALESCE(tenants.phone, '')) LIKE $${values.length}
                OR LOWER(COALESCE(tenants.admission_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(institutions.institution_name, '')) LIKE $${values.length}
                OR LOWER(COALESCE(rooms.room_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(beds.bed_number, '')) LIKE $${values.length}
            )
        `);
    }

    const result = await pool.query(`
        WITH reminder_base AS (
            SELECT
                tenant_monthly_dues.*,
                tenants.full_name,
                tenants.phone,
                tenants.email,
                tenants.admission_number,
                tenants.status AS tenant_status,
                tenants.agreed_monthly_rent,
                institutions.institution_name,
                floors.floor_name,
                rooms.room_number,
                beds.bed_number,
                GREATEST((CURRENT_DATE - tenant_monthly_dues.due_date)::int, 0) AS aging_days,
                (tenant_monthly_dues.due_date - CURRENT_DATE)::int AS days_to_due,
                CASE
                    WHEN tenant_monthly_dues.due_date < CURRENT_DATE THEN 'overdue'
                    WHEN tenant_monthly_dues.due_date = CURRENT_DATE THEN 'due_today'
                    WHEN tenant_monthly_dues.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                    ELSE 'upcoming'
                END AS reminder_bucket
            FROM tenant_monthly_dues
            INNER JOIN tenants
                ON tenants.id = tenant_monthly_dues.tenant_id
            INNER JOIN institutions
                ON institutions.id = tenant_monthly_dues.institution_id
            LEFT JOIN floors
                ON floors.id = tenants.floor_id
            LEFT JOIN rooms
                ON rooms.id = tenants.room_id
            LEFT JOIN beds
                ON beds.id = tenants.bed_id
            WHERE ${whereConditions.join(" AND ")}
        )
        SELECT
            reminder_base.*,
            latest_action.action_type AS last_action_type,
            latest_action.action_note AS last_action_note,
            latest_action.promise_date AS last_promise_date,
            latest_action.created_at AS last_action_at
        FROM reminder_base
        LEFT JOIN LATERAL (
            SELECT
                action_type,
                action_note,
                promise_date,
                created_at
            FROM payment_reminder_actions
            WHERE payment_reminder_actions.monthly_due_id = reminder_base.id
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        ) AS latest_action
            ON TRUE
        ORDER BY
            reminder_base.due_date ASC,
            reminder_base.pending_amount DESC,
            reminder_base.full_name ASC
    `, values);

    return result.rows;
};

const getPaymentReminderSummary = async (institutionId = null, windowDays = 30) => {
    await ensurePaymentReminderSchema();

    const values = [];
    const whereConditions = [
        "tenants.deleted_at IS NULL",
        "tenants.status IN ('active', 'notice_period', 'pending_verification')",
        "tenant_monthly_dues.pending_amount > 0",
    ];

    values.push(normalizeInteger(windowDays) || 30);
    whereConditions.push(`
        tenant_monthly_dues.due_date <= CURRENT_DATE + ($${values.length}::int * INTERVAL '1 day')
    `);

    if (institutionId) {
        values.push(institutionId);
        whereConditions.push(`tenant_monthly_dues.institution_id = $${values.length}`);
    }

    const result = await pool.query(`
        SELECT
            COUNT(*) AS total_reminders,
            COUNT(*) FILTER (WHERE tenant_monthly_dues.due_date < CURRENT_DATE) AS overdue_count,
            COUNT(*) FILTER (WHERE tenant_monthly_dues.due_date = CURRENT_DATE) AS due_today_count,
            COUNT(*) FILTER (
                WHERE tenant_monthly_dues.due_date > CURRENT_DATE
                  AND tenant_monthly_dues.due_date <= CURRENT_DATE + INTERVAL '7 days'
            ) AS due_soon_count,
            COALESCE(SUM(tenant_monthly_dues.pending_amount), 0) AS pending_amount,
            COALESCE(SUM(tenant_monthly_dues.pending_amount) FILTER (
                WHERE tenant_monthly_dues.due_date < CURRENT_DATE
            ), 0) AS overdue_amount
        FROM tenant_monthly_dues
        INNER JOIN tenants
            ON tenants.id = tenant_monthly_dues.tenant_id
        WHERE ${whereConditions.join(" AND ")}
    `, values);

    return result.rows[0];
};

const createPaymentReminderAction = async ({
    monthlyDueId,
    tenantId,
    actionType,
    actionNote,
    promiseDate,
    createdBy,
}) => {
    await ensurePaymentReminderSchema();

    const result = await pool.query(`
        INSERT INTO payment_reminder_actions (
            monthly_due_id,
            tenant_id,
            action_type,
            action_note,
            promise_date,
            created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `, [
        monthlyDueId,
        tenantId,
        actionType,
        actionNote,
        promiseDate,
        createdBy || null,
    ]);

    return result.rows[0];
};

const collectPaymentReminderDues = async ({
    monthlyDueIds = [],
    paymentMode = "cash",
    paymentDate = null,
    referenceNumber = null,
    notes = null,
    createdBy = null,
    institutionId = null,
}) => {
    await ensurePaymentReminderSchema();

    const normalizedDueIds = monthlyDueIds
        .map((id) => normalizeInteger(id))
        .filter(Boolean);

    if (!normalizedDueIds.length) {
        throw Object.assign(new Error("Monthly due selection is required"), {
            code: "DUE_SELECTION_REQUIRED",
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const values = [normalizedDueIds];
        const whereConditions = [
            "tenant_monthly_dues.id = ANY($1)",
            "tenant_monthly_dues.pending_amount > 0",
            "tenants.deleted_at IS NULL",
        ];

        if (institutionId) {
            values.push(institutionId);
            whereConditions.push(`tenant_monthly_dues.institution_id = $${values.length}`);
        }

        const duesResult = await client.query(`
            SELECT
                tenant_monthly_dues.*,
                tenants.full_name
            FROM tenant_monthly_dues
            INNER JOIN tenants
                ON tenants.id = tenant_monthly_dues.tenant_id
            WHERE ${whereConditions.join(" AND ")}
            ORDER BY tenant_monthly_dues.due_date ASC, tenant_monthly_dues.id ASC
            FOR UPDATE OF tenant_monthly_dues
        `, values);

        if (!duesResult.rows.length) {
            throw Object.assign(new Error("No pending due records found"), {
                code: "NO_PENDING_DUES",
            });
        }

        const firstDue = duesResult.rows[0];
        const hasMixedTenant = duesResult.rows.some((due) => {
            return Number(due.tenant_id) !== Number(firstDue.tenant_id);
        });

        if (hasMixedTenant) {
            throw Object.assign(new Error("Collection can only be recorded for one tenant at a time"), {
                code: "MIXED_TENANT_DUES",
            });
        }

        const totalAmount = duesResult.rows.reduce((sum, due) => {
            return sum + Number(due.pending_amount || 0);
        }, 0);

        const payment = await createTenantPayment({
            tenant_id: firstDue.tenant_id,
            institution_id: firstDue.institution_id,
            amount: totalAmount,
            payment_type: "rent",
            payment_mode: paymentMode || "cash",
            payment_date: paymentDate || new Date().toISOString().split("T")[0],
            reference_number: referenceNumber || null,
            verification_status: "verified",
            notes: notes || `Rent collected for ${duesResult.rows.length} due cycle(s)`,
            status: "completed",
            paid_amount: totalAmount,
            due_amount: 0,
            created_by: createdBy || null,
            verified_by: createdBy || null,
        }, client);

        for (const due of duesResult.rows) {
            await client.query(`
                INSERT INTO payment_reminder_actions (
                    monthly_due_id,
                    tenant_id,
                    action_type,
                    action_note,
                    created_by
                )
                VALUES ($1, $2, 'collected', $3, $4)
            `, [
                due.id,
                due.tenant_id,
                `Collected ${Number(due.pending_amount || 0)} against due ${due.due_date}`,
                createdBy || null,
            ]);
        }

        await client.query("COMMIT");

        return {
            payment,
            collected_dues: duesResult.rows,
            total_amount: totalAmount,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    collectPaymentReminderDues,
    createPaymentReminderAction,
    ensurePaymentReminderSchema,
    getPaymentReminderSummary,
    getPaymentReminders,
    normalizeInteger,
    normalizeText,
    syncPaymentReminderDueWindow,
};
