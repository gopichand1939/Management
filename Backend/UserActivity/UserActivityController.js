const {
    getActivityLogs,
    countActivityLogs,
    updateLogoutTime,
    terminateSessionLog
} = require("./UserActivityModel");

/**
 * Controller to fetch list of user login activity logs.
 * Triggered by POST /api/user-activity/list.
 * Clean, simple, and easy to read.
 */
const listUserActivity = async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Extract filters and pagination options from request body (since it is a POST)
        const {
            page = 1,
            limit = 10,
            search = "",
            role = "",
            platform = ""
        } = req.body;

        // Convert page and limit parameters to numbers
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        
        // Calculate query offset for SQL pagination
        const offsetNum = (pageNum - 1) * limitNum;

        // Build the filter object
        const filters = {
            search: search.trim(),
            role: role.trim(),
            platform: platform.trim(),
            limit: limitNum,
            offset: offsetNum
        };

        // Multi-tenancy check:
        // If logged-in user is a pg_admin, restrict to their institution only.
        // If super_admin, they can view everything or pass a specific institution ID.
        if (currentUser.role === "pg_admin") {
            filters.institutionId = currentUser.institution_id;
        } else if (req.body.institutionId) {
            filters.institutionId = parseInt(req.body.institutionId, 10);
        }

        // Fetch logs and counts from the database model
        const logs = await getActivityLogs(filters);
        const totalCount = await countActivityLogs(filters);

        // Calculate total pages
        const totalPages = Math.ceil(totalCount / limitNum);

        // Send a successful response back to the client
        return res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                totalItems: totalCount,
                totalPages: totalPages,
                currentPage: pageNum,
                pageSize: limitNum
            }
        });

    } catch (error) {
        console.error("Failed to list user activity logs:", error);
        
        return res.status(500).json({
            success: false,
            message: "Failed to load user activity records"
        });
    }
};

/**
 * Controller to handle logging out on the server side.
 * Triggered by POST /api/user-activity/logout.
 * Finds the latest active log for the user and logs the logout time.
 */
const logoutUserActivity = async (req, res) => {
    try {
        const credentialId = req.user.credential_id;

        if (credentialId) {
            await updateLogoutTime(credentialId);
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Failed to log logout activity:", error);
        
        // Return 200 even on error so that the frontend's local logout isn't blocked
        return res.status(200).json({
            success: true,
            message: "Logged out locally"
        });
    }
};

/**
 * Controller to handle remote session termination (forcing device logout).
 * Triggered by POST /api/user-activity/terminate.
 */
const terminateSession = async (req, res) => {
    try {
        const { logId } = req.body;
        if (!logId) {
            return res.status(400).json({
                success: false,
                message: "Log ID is required"
            });
        }

        // Multi-tenancy check: PG admins can only terminate logs in their institution
        if (req.user.role === "pg_admin") {
            const pool = require("../Config/Database");
            const checkRes = await pool.query(
                "SELECT institution_id FROM user_activity_logs WHERE id = $1",
                [logId]
            );
            if (checkRes.rows.length === 0 || checkRes.rows[0].institution_id !== req.user.institution_id) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }
        }

        await terminateSessionLog(logId);

        return res.status(200).json({
            success: true,
            message: "Session terminated successfully"
        });
    } catch (error) {
        console.error("Failed to terminate session:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during session termination"
        });
    }
};

module.exports = {
    listUserActivity,
    logoutUserActivity,
    terminateSession
};
