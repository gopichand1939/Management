const {
    deleteWeeklyFoodMenuById,
    findWeeklyFoodMenuById,
    getActiveInstitutionMealTypes,
    getWeeklyFoodMenuList,
    saveWeeklyFoodMenus,
} = require("./WeeklyFoodMenuModal");

const WEEK_DAYS = [
    { day_name: "Monday", day_order: 1 },
    { day_name: "Tuesday", day_order: 2 },
    { day_name: "Wednesday", day_order: 3 },
    { day_name: "Thursday", day_order: 4 },
    { day_name: "Friday", day_order: 5 },
    { day_name: "Saturday", day_order: 6 },
    { day_name: "Sunday", day_order: 7 },
];

const normalizeInteger = (value) => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const normalizedValue = Number(value);
    return Number.isInteger(normalizedValue) ? normalizedValue : null;
};

const normalizeText = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== "string") {
        return String(value);
    }

    return value.trim();
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

const getDayByOrder = (dayOrder) => {
    return WEEK_DAYS.find((day) => day.day_order === dayOrder) || null;
};

const logWeeklyFoodMenuError = (label, error, extra = {}) => {
    console.error(label, {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        extra,
    });
};

const validateWeeklyFoodMenuAccess = (req, menuItem) => {
    if (
        isPgAdminRequest(req) &&
        Number(menuItem.institution_id) !== Number(req.user?.institution_id)
    ) {
        return false;
    }

    return true;
};

const getWeeklyFoodMenuGrid = async (req, res) => {
    try {
        const institutionId = getInstitutionId(req);

        if (!institutionId) {
            return res.status(400).json({
                success: false,
                message: "Institution id is required",
            });
        }

        const [mealTypes, menus] = await Promise.all([
            getActiveInstitutionMealTypes(institutionId),
            getWeeklyFoodMenuList(institutionId),
        ]);

        const menuMap = {};

        for (const menu of menus) {
            if (!menuMap[menu.day_order]) {
                menuMap[menu.day_order] = {};
            }

            menuMap[menu.day_order][menu.meal_type_id] = menu;
        }

        return res.status(200).json({
            success: true,
            message: "Weekly food menu grid fetched successfully",
            days: WEEK_DAYS,
            mealTypes,
            menus,
            menuMap,
        });
    } catch (error) {
        logWeeklyFoodMenuError("Weekly food menu grid fetch failed:", error, {
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Weekly food menu grid fetch failed",
        });
    }
};

const saveWeeklyFoodMenu = async (req, res) => {
    try {
        const institutionId = getInstitutionId(req);
        const menus = Array.isArray(req.body?.menus) ? req.body.menus : [];

        if (!institutionId) {
            return res.status(400).json({
                success: false,
                message: "Institution id is required",
            });
        }

        if (!menus.length) {
            return res.status(400).json({
                success: false,
                message: "Menus data is required",
            });
        }

        const mealTypes = await getActiveInstitutionMealTypes(institutionId);
        const activeMealTypeIds = new Set(mealTypes.map((mealType) => Number(mealType.id)));
        const normalizedMenus = [];
        const uniqueMenuKeys = new Set();

        for (const menu of menus) {
            const dayOrder = normalizeInteger(menu.day_order);
            const mealTypeId = normalizeInteger(menu.meal_type_id);
            const day = getDayByOrder(dayOrder);

            if (!day) {
                return res.status(400).json({
                    success: false,
                    message: "Valid day order is required",
                });
            }

            if (!mealTypeId || !activeMealTypeIds.has(mealTypeId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid active meal type is required",
                });
            }

            const menuKey = `${day.day_order}_${mealTypeId}`;

            if (uniqueMenuKeys.has(menuKey)) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate day and meal type combination is not allowed",
                });
            }

            uniqueMenuKeys.add(menuKey);

            normalizedMenus.push({
                day_name: day.day_name,
                day_order: day.day_order,
                meal_type_id: mealTypeId,
                food_items: normalizeText(menu.food_items),
            });
        }

        const savedMenus = await saveWeeklyFoodMenus(
            institutionId,
            normalizedMenus,
            req.user?.id || null
        );

        return res.status(200).json({
            success: true,
            message: "Weekly food menu saved successfully",
            menus: savedMenus,
        });
    } catch (error) {
        logWeeklyFoodMenuError("Weekly food menu save failed:", error, {
            institution_id: req.body?.institution_id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
            menu_count: Array.isArray(req.body?.menus) ? req.body.menus.length : 0,
        });

        if (error.code === "23505") {
            return res.status(400).json({
                success: false,
                message: "Duplicate day and meal type combination is not allowed",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Weekly food menu save failed",
        });
    }
};

const deleteWeeklyFoodMenu = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Weekly food menu id is required",
            });
        }

        const existingMenu = await findWeeklyFoodMenuById(id);

        if (!existingMenu) {
            return res.status(404).json({
                success: false,
                message: "Weekly food menu not found",
            });
        }

        if (!validateWeeklyFoodMenuAccess(req, existingMenu)) {
            return res.status(403).json({
                success: false,
                message: "Access denied for this weekly food menu",
            });
        }

        const deletedMenu = await deleteWeeklyFoodMenuById(
            id,
            getInstitutionId(req, existingMenu.institution_id),
            req.user?.id || null
        );

        return res.status(200).json({
            success: true,
            message: "Weekly food menu deleted successfully",
            menu: deletedMenu,
        });
    } catch (error) {
        logWeeklyFoodMenuError("Weekly food menu delete failed:", error, {
            id: req.body?.id,
            role: req.user?.role,
            user_institution_id: req.user?.institution_id,
        });

        return res.status(500).json({
            success: false,
            message: "Weekly food menu delete failed",
        });
    }
};

module.exports = {
    getWeeklyFoodMenuGrid,
    saveWeeklyFoodMenu,
    deleteWeeklyFoodMenu,
};
