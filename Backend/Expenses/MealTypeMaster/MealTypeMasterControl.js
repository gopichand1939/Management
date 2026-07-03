const {
    createMealType,
    deleteMealTypeById,
    findMealTypeById,
    getActiveMealTypeList,
    getMealTypeList,
    updateMealType,
    updateMealTypeStatus,
} = require("./MealTypeMasterModal");

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

const normalizeBoolean = (value) => {
    if (typeof value === "boolean") {
        return value;
    }

    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    return true;
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

const validateMealTypeAccess = (req, mealType) => {
    if (
        isPgAdminRequest(req) &&
        Number(mealType.institution_id) !== Number(req.user?.institution_id)
    ) {
        return false;
    }

    return true;
};

const logMealTypeError = (label, error, extra = {}) => {
    console.error(label, {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        extra,
    });
};

const normalizeMealTypePayload = (body, userId, institutionId) => {
    return {
        institution_id: institutionId,
        meal_type_name: normalizeText(body.meal_type_name),
        meal_type_code: normalizeText(body.meal_type_code)?.toUpperCase(),
        display_order: normalizeInteger(body.display_order),
        start_time: normalizeText(body.start_time),
        end_time: normalizeText(body.end_time),
        description: normalizeText(body.description),
        is_active: normalizeBoolean(body.is_active),
        created_by: userId,
        updated_by: userId,
    };
};

const validateMealTypePayload = (data) => {
    if (!data.institution_id) {
        return "Institution id is required";
    }

    if (!data.meal_type_name) {
        return "Meal type name is required";
    }

    if (!data.meal_type_code) {
        return "Meal type code is required";
    }

    if (data.display_order === null) {
        return "Display order is required";
    }

    return null;
};

const addMealType = async (req, res) => {
    try {
        const institutionId = getInstitutionId(req);
        const data = normalizeMealTypePayload(
            req.body,
            req.user?.id || null,
            institutionId
        );

        const validationMessage = validateMealTypePayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const mealType = await createMealType(data);

        return res.status(201).json({
            success: true,
            message: "Meal type created successfully",
            mealType,
        });
    } catch (error) {
        logMealTypeError("Meal type create failed:", error, {
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Meal type name or code already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Meal type create failed",
        });
    }
};

const listMealTypes = async (req, res) => {
    try {
        const institutionId = getInstitutionId(req);

        const mealTypes = await getMealTypeList(institutionId);

        return res.status(200).json({
            success: true,
            message: "Meal type list fetched successfully",
            mealTypes,
        });
    } catch (error) {
        logMealTypeError("Meal type list failed:", error, {
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Meal type list failed",
        });
    }
};

const listActiveMealTypes = async (req, res) => {
    try {
        const institutionId = getInstitutionId(req);

        const mealTypes = await getActiveMealTypeList(institutionId);

        return res.status(200).json({
            success: true,
            message: "Active meal type list fetched successfully",
            mealTypes,
        });
    } catch (error) {
        logMealTypeError("Active meal type list failed:", error, {
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Active meal type list failed",
        });
    }
};

const viewMealType = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Meal type id is required",
            });
        }

        const mealType = await findMealTypeById(id);

        if (!mealType) {
            return res.status(404).json({
                success: false,
                message: "Meal type not found",
            });
        }

        if (!validateMealTypeAccess(req, mealType)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this meal type",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Meal type fetched successfully",
            mealType,
        });
    } catch (error) {
        logMealTypeError("Meal type fetch failed:", error, {
            id: req.body?.id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Meal type fetch failed",
        });
    }
};

const editMealType = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Meal type id is required",
            });
        }

        const existingMealType = await findMealTypeById(id);

        if (!existingMealType) {
            return res.status(404).json({
                success: false,
                message: "Meal type not found",
            });
        }

        if (!validateMealTypeAccess(req, existingMealType)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this meal type",
            });
        }

        const data = {
            ...normalizeMealTypePayload(
                req.body,
                req.user?.id || null,
                getInstitutionId(req, existingMealType.institution_id)
            ),
            id,
        };

        const validationMessage = validateMealTypePayload(data);

        if (validationMessage) {
            return res.status(400).json({
                success: false,
                message: validationMessage,
            });
        }

        const mealType = await updateMealType(data);

        if (!mealType) {
            return res.status(404).json({
                success: false,
                message: "Meal type not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Meal type updated successfully",
            mealType,
        });
    } catch (error) {
        logMealTypeError("Meal type update failed:", error, {
            id: req.body?.id,
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Meal type name or code already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Meal type update failed",
        });
    }
};

const changeMealTypeStatus = async (req, res) => {
    try {
        const { id, is_active } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Meal type id is required",
            });
        }

        const existingMealType = await findMealTypeById(id);

        if (!existingMealType) {
            return res.status(404).json({
                success: false,
                message: "Meal type not found",
            });
        }

        if (!validateMealTypeAccess(req, existingMealType)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this meal type",
            });
        }

        const mealType = await updateMealTypeStatus(
            id,
            getInstitutionId(req, existingMealType.institution_id),
            normalizeBoolean(is_active),
            req.user?.id || null
        );

        if (!mealType) {
            return res.status(404).json({
                success: false,
                message: "Meal type not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Meal type status updated successfully",
            mealType,
        });
    } catch (error) {
        logMealTypeError("Meal type status update failed:", error, {
            id: req.body?.id,
            is_active: req.body?.is_active,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Meal type status update failed",
        });
    }
};

const deleteMealType = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Meal type id is required",
            });
        }

        const existingMealType = await findMealTypeById(id);

        if (!existingMealType) {
            return res.status(404).json({
                success: false,
                message: "Meal type not found",
            });
        }

        if (!validateMealTypeAccess(req, existingMealType)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this meal type",
            });
        }

        const mealType = await deleteMealTypeById(
            id,
            getInstitutionId(req, existingMealType.institution_id),
            req.user?.id || null
        );

        if (!mealType) {
            return res.status(404).json({
                success: false,
                message: "Meal type not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Meal type deleted successfully",
            mealType,
        });
    } catch (error) {
        logMealTypeError("Meal type delete failed:", error, {
            id: req.body?.id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Meal type delete failed",
        });
    }
};

module.exports = {
    addMealType,
    listMealTypes,
    listActiveMealTypes,
    viewMealType,
    editMealType,
    changeMealTypeStatus,
    deleteMealType,
};
