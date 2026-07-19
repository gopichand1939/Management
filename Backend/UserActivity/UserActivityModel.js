const pool = require("../Config/Database");

/**
 * Inserts a new user activity log into the database.
 * Every SQL line and parameter is laid out step-by-step for readability.
 */
const insertActivityLog = async (data) => {
    const queryStr = `
        INSERT INTO user_activity_logs (
            credential_id,
            email,
            role,
            institution_id,
            latitude,
            longitude,
            device_info,
            platform,
            ip_address
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
        )
        RETURNING id
    `;

    const values = [
        data.credentialId,
        data.email,
        data.role,
        data.institutionId,
        data.latitude,
        data.longitude,
        data.deviceInfo,
        data.platform,
        data.ipAddress
    ];

    const result = await pool.query(queryStr, values);
    return result.rows[0];
};

/**
 * Fetches user activity logs with optional filtering by institution.
 * Uses pagination to load data in pages.
 */
const getActivityLogs = async (filters) => {
    let queryStr = `
        SELECT
            id,
            credential_id,
            email,
            role,
            institution_id,
            latitude,
            longitude,
            device_info,
            platform,
            ip_address,
            login_time,
            logout_time
        FROM user_activity_logs
    `;

    const conditions = [];
    const values = [];

    // Filter by institution if specified (e.g. for PG Admin role)
    if (filters.institutionId) {
        values.push(filters.institutionId);
        conditions.push(`institution_id = $${values.length}`);
    }

    // Filter by specific role (e.g. super_admin or pg_admin)
    if (filters.role) {
        values.push(filters.role);
        conditions.push(`role = $${values.length}`);
    }

    // Filter by search keyword (email or IP address)
    if (filters.search) {
        values.push(`%${filters.search}%`);
        conditions.push(`(email ILIKE $${values.length} OR ip_address ILIKE $${values.length})`);
    }

    // Append WHERE clause if there are conditions
    if (conditions.length > 0) {
        queryStr += ` WHERE ` + conditions.join(" AND ");
    }

    // Always sort by newest login time first
    queryStr += ` ORDER BY login_time DESC`;

    // Implement pagination limit
    if (filters.limit) {
        values.push(filters.limit);
        queryStr += ` LIMIT $${values.length}`;
    }

    // Implement pagination offset
    if (filters.offset) {
        values.push(filters.offset);
        queryStr += ` OFFSET $${values.length}`;
    }

    const result = await pool.query(queryStr, values);
    return result.rows;
};

/**
 * Counts total activity log records matching filters.
 * Used for frontend pagination controls.
 */
const countActivityLogs = async (filters) => {
    let queryStr = `
        SELECT COUNT(*) AS total
        FROM user_activity_logs
    `;

    const conditions = [];
    const values = [];

    if (filters.institutionId) {
        values.push(filters.institutionId);
        conditions.push(`institution_id = $${values.length}`);
    }

    if (filters.role) {
        values.push(filters.role);
        conditions.push(`role = $${values.length}`);
    }

    if (filters.search) {
        values.push(`%${filters.search}%`);
        conditions.push(`(email ILIKE $${values.length} OR ip_address ILIKE $${values.length})`);
    }

    if (conditions.length > 0) {
        queryStr += ` WHERE ` + conditions.join(" AND ");
    }

    const result = await pool.query(queryStr, values);
    return parseInt(result.rows[0].total, 10);
};

/**
 * Updates the logout_time timestamp to the current time
 * for the latest active login record of the credential.
 */
const updateLogoutTime = async (credentialId) => {
    const queryStr = `
        UPDATE user_activity_logs
        SET logout_time = CURRENT_TIMESTAMP
        WHERE id = (
            SELECT id
            FROM user_activity_logs
            WHERE credential_id = $1
              AND logout_time IS NULL
            ORDER BY login_time DESC
            LIMIT 1
        )
        RETURNING id
    `;

    const result = await pool.query(queryStr, [credentialId]);
    return result.rows[0];
};

/**
 * Updates the logout_time timestamp to current time for a specific log ID.
 * Used for remote session termination/device logout.
 */
const terminateSessionLog = async (logId) => {
    const queryStr = `
        UPDATE user_activity_logs
        SET logout_time = CURRENT_TIMESTAMP
        WHERE id = $1
          AND logout_time IS NULL
        RETURNING id
    `;

    const result = await pool.query(queryStr, [logId]);
    return result.rows[0];
};

module.exports = {
    insertActivityLog,
    getActivityLogs,
    countActivityLogs,
    updateLogoutTime,
    terminateSessionLog,
};

