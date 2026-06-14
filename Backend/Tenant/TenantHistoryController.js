const { normalizeInteger } = require("./TenantHelpers");
const { getTenantHistoryById } = require("./TenantHistoryModel");

const isPgAdminRequest = (req) => {
    return req.user?.role === "pg_admin";
};

const viewTenantHistory = async (req, res) => {
    try {
        const tenantId = normalizeInteger(req.body.tenant_id || req.body.id);

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: "Tenant id is required",
            });
        }

        const history = await getTenantHistoryById(tenantId);

        if (!history) {
            return res.status(404).json({
                success: false,
                message: "Tenant history not found",
            });
        }

        if (
            isPgAdminRequest(req) &&
            Number(history.tenant.institution_id) !== Number(req.pgAdmin.institution_id)
        ) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this tenant history",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Tenant history fetched successfully",
            history,
        });
    } catch (error) {
        console.error("Tenant history fetch failed:", error);

        return res.status(500).json({
            success: false,
            message: "Tenant history fetch failed",
        });
    }
};

module.exports = {
    viewTenantHistory,
};
