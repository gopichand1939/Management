const {
    collectPaymentReminderDues,
    createPaymentReminderAction,
    getPaymentReminderSummary,
    getPaymentReminders,
    normalizeInteger,
    normalizeText,
} = require("./PaymnetReminderModal");

const isPgAdminRequest = (req) => {
    return req.user?.role === "pg_admin";
};

const resolveInstitutionId = (req) => {
    return isPgAdminRequest(req)
        ? normalizeInteger(req.pgAdmin?.institution_id)
        : normalizeInteger(req.body.institution_id);
};

const listPaymentReminders = async (req, res) => {
    try {
        const institutionId = resolveInstitutionId(req);
        const windowDays = normalizeInteger(req.body.window_days) || 30;

        const [reminders, summary] = await Promise.all([
            getPaymentReminders({
                institutionId,
                search: normalizeText(req.body.search) || "",
                status: normalizeText(req.body.status) || "all",
                windowDays,
            }),
            getPaymentReminderSummary(institutionId, windowDays),
        ]);

        return res.status(200).json({
            success: true,
            message: "Payment reminders fetched successfully",
            reminders,
            summary,
        });
    } catch (error) {
        console.error("Payment reminder fetch failed:", error);

        return res.status(500).json({
            success: false,
            message: "Payment reminder fetch failed",
        });
    }
};

const addPaymentReminderAction = async (req, res) => {
    try {
        const monthlyDueId = normalizeInteger(req.body.monthly_due_id);
        const tenantId = normalizeInteger(req.body.tenant_id);
        const actionType = normalizeText(req.body.action_type) || "follow_up";

        if (!monthlyDueId || !tenantId) {
            return res.status(400).json({
                success: false,
                message: "Monthly due and tenant are required",
            });
        }

        const action = await createPaymentReminderAction({
            monthlyDueId,
            tenantId,
            actionType,
            actionNote: normalizeText(req.body.action_note),
            promiseDate: normalizeText(req.body.promise_date),
            createdBy: req.user?.id || null,
        });

        return res.status(201).json({
            success: true,
            message: "Payment reminder action saved successfully",
            action,
        });
    } catch (error) {
        console.error("Payment reminder action failed:", error);

        return res.status(500).json({
            success: false,
            message: "Payment reminder action failed",
        });
    }
};

const collectPaymentReminder = async (req, res) => {
    try {
        const collection = await collectPaymentReminderDues({
            monthlyDueIds: Array.isArray(req.body.monthly_due_ids)
                ? req.body.monthly_due_ids
                : [req.body.monthly_due_id],
            paymentMode: normalizeText(req.body.payment_mode) || "cash",
            paymentDate: normalizeText(req.body.payment_date),
            referenceNumber: normalizeText(req.body.reference_number),
            notes: normalizeText(req.body.notes),
            createdBy: req.user?.id || null,
            institutionId: isPgAdminRequest(req) ? normalizeInteger(req.pgAdmin?.institution_id) : null,
        });

        return res.status(201).json({
            success: true,
            message: "Payment collection recorded successfully",
            ...collection,
        });
    } catch (error) {
        console.error("Payment reminder collection failed:", error);

        const clientMessage = [
            "DUE_SELECTION_REQUIRED",
            "NO_PENDING_DUES",
            "MIXED_TENANT_DUES",
        ].includes(error.code)
            ? error.message
            : "Payment reminder collection failed";

        return res.status(error.code ? 400 : 500).json({
            success: false,
            message: clientMessage,
        });
    }
};

module.exports = {
    addPaymentReminderAction,
    collectPaymentReminder,
    listPaymentReminders,
};
