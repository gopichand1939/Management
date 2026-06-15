const pool = require("../Config/Database");

const getDashboardOverviewStats = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            (SELECT COUNT(*)::INTEGER FROM institutions ${institutionId ? 'WHERE id = $1' : ''}) AS total_institutions,
            (SELECT COUNT(*)::INTEGER FROM floors ${institutionId ? 'WHERE institution_id = $1' : ''}) AS total_floors,
            (SELECT COUNT(*)::INTEGER FROM rooms ${institutionId ? 'WHERE institution_id = $1' : ''}) AS total_rooms,
            (SELECT COUNT(*)::INTEGER FROM beds ${institutionId ? 'WHERE institution_id = $1' : ''}) AS total_beds,
            (SELECT COUNT(*)::INTEGER FROM beds WHERE LOWER(COALESCE(status, 'vacant')) = 'occupied' ${institutionId ? 'AND institution_id = $1' : ''}) AS occupied_beds,
            (SELECT COUNT(*)::INTEGER FROM beds WHERE LOWER(COALESCE(status, 'vacant')) = 'vacant' ${institutionId ? 'AND institution_id = $1' : ''}) AS vacant_beds,
            (SELECT COUNT(*)::INTEGER FROM beds WHERE LOWER(COALESCE(status, 'vacant')) = 'reserved' ${institutionId ? 'AND institution_id = $1' : ''}) AS reserved_beds,
            (SELECT COUNT(*)::INTEGER FROM beds WHERE LOWER(COALESCE(status, 'vacant')) = 'maintenance' ${institutionId ? 'AND institution_id = $1' : ''}) AS maintenance_beds,
            (SELECT COUNT(*)::INTEGER FROM tenants WHERE deleted_at IS NULL ${institutionId ? 'AND institution_id = $1' : ''}) AS total_tenants,
            (SELECT COUNT(*)::INTEGER FROM tenants WHERE status = 'active' AND deleted_at IS NULL ${institutionId ? 'AND institution_id = $1' : ''}) AS active_tenants,
            (SELECT COUNT(*)::INTEGER FROM tenants WHERE status = 'pending_verification' AND deleted_at IS NULL ${institutionId ? 'AND institution_id = $1' : ''}) AS pending_verification_tenants,
            (SELECT COUNT(*)::INTEGER FROM tenants WHERE status = 'vacated' AND deleted_at IS NULL ${institutionId ? 'AND institution_id = $1' : ''}) AS vacated_tenants
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

const getDashboardRevenueStats = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            (
                SELECT COALESCE(SUM(total_rent), 0)::NUMERIC
                FROM tenant_monthly_dues
                WHERE DATE_TRUNC('month', due_month) = DATE_TRUNC('month', CURRENT_DATE)
                  ${institutionId ? 'AND institution_id = $1' : ''}
            ) AS total_monthly_revenue,
            (
                SELECT COALESCE(SUM(amount), 0)::NUMERIC
                FROM tenant_payments
                WHERE status = 'completed' AND verification_status = 'verified'
                  AND DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', CURRENT_DATE)
                  ${institutionId ? 'AND institution_id = $1' : ''}
            ) AS collected_payments,
            (
                SELECT COALESCE(SUM(pending_amount), 0)::NUMERIC
                FROM tenant_monthly_dues
                WHERE status = 'pending' AND due_date >= CURRENT_DATE
                  AND DATE_TRUNC('month', due_month) = DATE_TRUNC('month', CURRENT_DATE)
                  ${institutionId ? 'AND institution_id = $1' : ''}
            ) AS pending_payments,
            (
                SELECT COALESCE(SUM(pending_amount), 0)::NUMERIC
                FROM tenant_monthly_dues
                WHERE status = 'pending' AND due_date < CURRENT_DATE
                  ${institutionId ? 'AND institution_id = $1' : ''}
            ) AS overdue_payments
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

const getInstitutionWiseStats = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            inst.id AS institution_id,
            inst.institution_name,
            inst.total_rooms,
            inst.total_beds,
            inst.occupied_beds,
            inst.vacant_beds,
            ROUND(COALESCE((inst.occupied_beds::numeric / NULLIF(inst.total_beds, 0)) * 100, 0), 2) AS occupancy_percentage
        FROM (
            SELECT
                id,
                institution_name,
                COALESCE((
                    SELECT COUNT(*)::INTEGER FROM rooms WHERE institution_id = institutions.id
                ), 0) AS total_rooms,
                COALESCE((
                    SELECT COUNT(*)::INTEGER FROM beds WHERE institution_id = institutions.id
                ), 0) AS total_beds,
                COALESCE((
                    SELECT COUNT(*)::INTEGER FROM beds WHERE institution_id = institutions.id AND LOWER(COALESCE(status, 'vacant')) = 'occupied'
                ), 0) AS occupied_beds,
                COALESCE((
                    SELECT COUNT(*)::INTEGER FROM beds WHERE institution_id = institutions.id AND LOWER(COALESCE(status, 'vacant')) = 'vacant'
                ), 0) AS vacant_beds
            FROM institutions
            ${institutionId ? 'WHERE id = $1' : ''}
        ) AS inst
        ORDER BY inst.institution_name ASC
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getFloorWiseStats = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            floors.id AS floor_id,
            floors.floor_name,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM rooms WHERE floor_id = floors.id
            ), 0) AS total_rooms,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM beds WHERE floor_id = floors.id
            ), 0) AS total_beds,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM beds WHERE floor_id = floors.id AND LOWER(COALESCE(status, 'vacant')) = 'occupied'
            ), 0) AS occupied_beds,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM beds WHERE floor_id = floors.id AND LOWER(COALESCE(status, 'vacant')) = 'vacant'
            ), 0) AS vacant_beds
        FROM floors
        ${institutionId ? 'WHERE floors.institution_id = $1' : ''}
        ORDER BY floors.floor_number ASC, floors.floor_name ASC
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getRoomWiseStats = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            rooms.id AS room_id,
            rooms.room_number,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM beds WHERE room_id = rooms.id
            ), 0) AS total_beds,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM beds WHERE room_id = rooms.id AND LOWER(COALESCE(status, 'vacant')) = 'occupied'
            ), 0) AS occupied_beds,
            COALESCE((
                SELECT COUNT(*)::INTEGER FROM beds WHERE room_id = rooms.id AND LOWER(COALESCE(status, 'vacant')) = 'vacant'
            ), 0) AS vacant_beds
        FROM rooms
        ${institutionId ? 'WHERE rooms.institution_id = $1' : ''}
        ORDER BY rooms.room_number ASC
        LIMIT 100
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getBedStatusChartData = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            LOWER(COALESCE(status, 'vacant')) AS status,
            COUNT(*)::INTEGER AS count
        FROM beds
        ${institutionId ? 'WHERE institution_id = $1' : ''}
        GROUP BY LOWER(COALESCE(status, 'vacant'))
        ORDER BY count DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getTenantStatusChartData = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            status,
            COUNT(*)::INTEGER AS count
        FROM tenants
        WHERE deleted_at IS NULL
          ${institutionId ? 'AND institution_id = $1' : ''}
        GROUP BY status
        ORDER BY count DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getMonthlyTrends = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            TO_CHAR(due_month, 'YYYY-MM') AS month,
            COUNT(DISTINCT tenant_id)::INTEGER AS occupied_beds,
            SUM(total_rent)::NUMERIC AS revenue
        FROM tenant_monthly_dues
        WHERE due_month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
          ${institutionId ? 'AND institution_id = $1' : ''}
        GROUP BY DATE_TRUNC('month', due_month), due_month
        ORDER BY DATE_TRUNC('month', due_month) ASC
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getRecentTenantActivities = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            logs.id,
            logs.tenant_id,
            tenants.full_name AS tenant_name,
            logs.action,
            logs.created_at,
            logs.new_value
        FROM tenant_activity_logs logs
        LEFT JOIN tenants ON tenants.id = logs.tenant_id
        WHERE tenants.deleted_at IS NULL
          ${institutionId ? 'AND logs.institution_id = $1' : ''}
        ORDER BY logs.created_at DESC
        LIMIT 10
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getRecentPayments = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            payments.id,
            payments.tenant_id,
            tenants.full_name AS tenant_name,
            payments.amount,
            payments.payment_type,
            payments.payment_mode,
            payments.payment_date,
            payments.status,
            payments.verification_status,
            payments.receipt_number
        FROM tenant_payments payments
        LEFT JOIN tenants ON tenants.id = payments.tenant_id
        WHERE tenants.deleted_at IS NULL
          ${institutionId ? 'AND payments.institution_id = $1' : ''}
        ORDER BY payments.created_at DESC, payments.id DESC
        LIMIT 10
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getUpcomingVacations = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            id,
            full_name,
            expected_checkout_date,
            status,
            room_id,
            bed_id
        FROM tenants
        WHERE expected_checkout_date IS NOT NULL
          AND status <> 'vacated'
          AND deleted_at IS NULL
          ${institutionId ? 'AND institution_id = $1' : ''}
        ORDER BY expected_checkout_date ASC
        LIMIT 10
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

const getAvailableBeds = async (institutionId = null) => {
    const values = [];
    if (institutionId) {
        values.push(institutionId);
    }

    const query = `
        SELECT
            beds.id,
            beds.bed_number,
            beds.bed_type,
            rooms.room_number,
            floors.floor_name,
            institutions.institution_name
        FROM beds
        INNER JOIN rooms ON rooms.id = beds.room_id
        INNER JOIN floors ON floors.id = beds.floor_id
        INNER JOIN institutions ON institutions.id = beds.institution_id
        WHERE LOWER(COALESCE(beds.status, 'vacant')) = 'vacant'
          ${institutionId ? 'AND beds.institution_id = $1' : ''}
        ORDER BY institutions.institution_name ASC, floors.floor_number ASC, rooms.room_number ASC, beds.bed_number ASC
        LIMIT 10
    `;

    const result = await pool.query(query, values);
    return result.rows;
};

module.exports = {
    getDashboardOverviewStats,
    getDashboardRevenueStats,
    getInstitutionWiseStats,
    getFloorWiseStats,
    getRoomWiseStats,
    getBedStatusChartData,
    getTenantStatusChartData,
    getMonthlyTrends,
    getRecentTenantActivities,
    getRecentPayments,
    getUpcomingVacations,
    getAvailableBeds,
};
