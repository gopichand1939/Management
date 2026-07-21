const {
    createDailyExpense,
    deleteDailyExpenseById,
    findDailyExpenseById,
    getDailyExpenseList,
    updateDailyExpense,
} = require("./DailyexpensesModal");

const normalizeText = (value) => {
    if (typeof value !== "string") {
        return value || null;
    }

    const normalizedValue = value.trim();
    return normalizedValue || null;
};

const normalizeInteger = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const normalizedValue = Number(value);
    return Number.isInteger(normalizedValue) ? normalizedValue : null;
};

const normalizeAmount = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const normalizedValue = Number(value);
    return Number.isFinite(normalizedValue) && normalizedValue > 0
        ? normalizedValue
        : null;
};

const normalizeDate = (value) => {
    if (!value) {
        return null;
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
        return null;
    }

    return String(value).slice(0, 10);
};

const normalizeTime = (value) => {
    if (!value) {
        return null;
    }

    const normalizedValue = String(value).trim().slice(0, 5);

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalizedValue)) {
        return null;
    }

    return normalizedValue;
};

const buildUploadedFileObject = (file) => {
    if (!file) {
        return null;
    }

    return {
        file_name: file.filename,
        original_name: file.originalname,
        file_url: file.cloudinaryUrl || `/uploads/daily-expenses/${file.filename}`,
        mime_type: file.mimetype,
        uploaded_at: new Date().toISOString(),
        size: file.size,
    };
};

const isPgAdminRequest = (req) => {
    return req.user?.role === "pg_admin";
};

const getInstitutionId = (req, fallbackInstitutionId = null) => {
    if (isPgAdminRequest(req)) {
        return normalizeInteger(req.user?.institution_id);
    }

    return (
        normalizeInteger(req.body.institution_id) ||
        normalizeInteger(fallbackInstitutionId) ||
        null
    );
};

const validateDailyExpenseAccess = (req, dailyExpense) => {
    if (
        isPgAdminRequest(req) &&
        Number(dailyExpense.institution_id) !== Number(req.user?.institution_id)
    ) {
        return false;
    }

    return true;
};

const logDailyExpenseError = (label, error, extra = {}) => {
    console.error(label, {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        extra,
    });
};

const normalizeDailyExpensePayload = (req, userId, institutionId, existingBillFile = null) => {
    const { body } = req;

    return {
        institution_id: institutionId,
        expense_title: normalizeText(body.expense_title),
        category: normalizeText(body.category),
        amount: normalizeAmount(body.amount),
        expense_date: normalizeDate(body.expense_date || body.date),
        expense_time: normalizeTime(body.expense_time || body.time),
        bill_file: buildUploadedFileObject(req.file) || existingBillFile,
        notes: normalizeText(body.notes || body.note),
        created_by: userId,
        updated_by: userId,
    };
};

const validateDailyExpensePayload = (data) => {
    if (!data.institution_id) {
        return "Institution id is required";
    }

    if (!data.expense_title) {
        return "Expense title is required";
    }

    if (!data.category) {
        return "Category is required";
    }

    if (data.amount === null) {
        return "Valid amount is required";
    }

    if (!data.expense_date) {
        return "Valid date is required";
    }

    if (!data.expense_time) {
        return "Valid time is required";
    }

    return null;
};

const addDailyExpense = async (req, res) => {
    try {
        const institutionId = getInstitutionId(req);
        const data = normalizeDailyExpensePayload(
            req,
            req.user?.id || null,
            institutionId
        );

        const validationMessage = validateDailyExpensePayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const dailyExpense = await createDailyExpense(data);

        return res.status(201).json({
            success: true,
            message: "Daily expense created successfully",
            dailyExpense,
        });
    } catch (error) {
        logDailyExpenseError("Daily expense create failed:", error, {
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Daily expense create failed",
        });
    }
};

const listDailyExpenses = async (req, res) => {
    try {
        const institutionId = getInstitutionId(req);

        const dailyExpenses = await getDailyExpenseList(institutionId);

        return res.status(200).json({
            success: true,
            message: "Daily expense list fetched successfully",
            dailyExpenses,
        });
    } catch (error) {
        logDailyExpenseError("Daily expense list failed:", error, {
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Daily expense list failed",
        });
    }
};

const viewDailyExpense = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Daily expense id is required",
            });
        }

        const dailyExpense = await findDailyExpenseById(id);

        if (!dailyExpense) {
            return res.status(404).json({
                success: false,
                message: "Daily expense not found",
            });
        }

        if (!validateDailyExpenseAccess(req, dailyExpense)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this daily expense",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Daily expense fetched successfully",
            dailyExpense,
        });
    } catch (error) {
        logDailyExpenseError("Daily expense fetch failed:", error, {
            id: req.body?.id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Daily expense fetch failed",
        });
    }
};

const editDailyExpense = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Daily expense id is required",
            });
        }

        const existingDailyExpense = await findDailyExpenseById(id);

        if (!existingDailyExpense) {
            return res.status(404).json({
                success: false,
                message: "Daily expense not found",
            });
        }

        if (!validateDailyExpenseAccess(req, existingDailyExpense)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this daily expense",
            });
        }

        const data = {
            ...normalizeDailyExpensePayload(
                req,
                req.user?.id || null,
                getInstitutionId(req, existingDailyExpense.institution_id),
                existingDailyExpense.bill_file
            ),
            id,
        };

        const validationMessage = validateDailyExpensePayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const dailyExpense = await updateDailyExpense(data);

        if (!dailyExpense) {
            return res.status(404).json({
                success: false,
                message: "Daily expense not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Daily expense updated successfully",
            dailyExpense,
        });
    } catch (error) {
        logDailyExpenseError("Daily expense update failed:", error, {
            id: req.body?.id,
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Daily expense update failed",
        });
    }
};

const deleteDailyExpense = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Daily expense id is required",
            });
        }

        const existingDailyExpense = await findDailyExpenseById(id);

        if (!existingDailyExpense) {
            return res.status(404).json({
                success: false,
                message: "Daily expense not found",
            });
        }

        if (!validateDailyExpenseAccess(req, existingDailyExpense)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this daily expense",
            });
        }

        const dailyExpense = await deleteDailyExpenseById(
            id,
            getInstitutionId(req, existingDailyExpense.institution_id),
            req.user?.id || null
        );

        if (!dailyExpense) {
            return res.status(404).json({
                success: false,
                message: "Daily expense not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Daily expense deleted successfully",
            dailyExpense,
        });
    } catch (error) {
        logDailyExpenseError("Daily expense delete failed:", error, {
            id: req.body?.id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Daily expense delete failed",
        });
    }
};

module.exports = {
    addDailyExpense,
    listDailyExpenses,
    viewDailyExpense,
    editDailyExpense,
    deleteDailyExpense,
};
