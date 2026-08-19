const model = require("./DailyMealTrackerModel");

// Helper to resolve institution_id based on role
const resolveInstitutionId = (req) => {
    if (req.user && req.user.role === "pg_admin") {
        return req.user.institution_id;
    }
    // Fallback for super_admin or public routes
    return req.query.institutionId || req.body.institutionId;
};

const getDailySummary = async (req, res, next) => {
    try {
        const { date } = req.query;
        const institutionId = resolveInstitutionId(req);

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required" });
        }
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const summary = await model.getMealCountsSummary(institutionId, date);
        res.json({ success: true, data: summary });
    } catch (error) {
        next(error);
    }
};

const listDailyMeals = async (req, res, next) => {
    try {
        const { date, roomId, floorId, searchText } = req.query;
        const institutionId = resolveInstitutionId(req);

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required" });
        }
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const meals = await model.listActiveTenantsWithMeals(institutionId, date, {
            roomId,
            floorId,
            searchText
        });

        res.json({ success: true, data: meals });
    } catch (error) {
        next(error);
    }
};

const updateMealEntry = async (req, res, next) => {
    try {
        const {
            tenantId,
            mealDate,
            breakfast,
            lunch,
            dinner,
            fullDayLeave,
            vacation,
            reason
        } = req.body;

        const institutionId = resolveInstitutionId(req);
        const userId = req.user.id;

        if (!tenantId || !mealDate) {
            return res.status(400).json({ success: false, message: "Tenant ID and Date are required" });
        }
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const record = await model.saveMealRecord({
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
        });

        res.json({ success: true, message: "Meal entry saved successfully", data: record });
    } catch (error) {
        next(error);
    }
};

const bulkUpdateMealEntries = async (req, res, next) => {
    try {
        const { records } = req.body;
        const institutionId = resolveInstitutionId(req);
        const userId = req.user.id;

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: "Records array is required" });
        }
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const updated = await model.saveBulkMealRecords(records, institutionId, userId);
        res.json({ success: true, message: "Bulk meal entries saved successfully", data: updated });
    } catch (error) {
        next(error);
    }
};

const verifyTenantPhone = async (req, res, next) => {
    try {
        const { phone, institutionId } = req.body;

        if (!phone || !institutionId) {
            return res.status(400).json({ success: false, message: "Phone number and Institution ID are required" });
        }

        const tenant = await model.findActiveTenantByPhone(phone, institutionId);

        if (!tenant) {
            return res.status(404).json({ success: false, message: "Active tenant not found with this phone number" });
        }

        res.json({
            success: true,
            message: "Tenant verified successfully",
            data: {
                id: tenant.id,
                full_name: tenant.full_name,
                phone: tenant.phone,
                room_number: tenant.room_number,
                floor_name: tenant.floor_name,
                institution_id: tenant.institution_id
            }
        });
    } catch (error) {
        next(error);
    }
};

const getTenantMeals = async (req, res, next) => {
    try {
        const { tenantId } = req.params;
        const { date } = req.query;

        if (!tenantId || !date) {
            return res.status(400).json({ success: false, message: "Tenant ID and date are required" });
        }

        const history = await model.getTenantMealHistory(tenantId);
        const todayRecord = history.find(r => {
            const d = new Date(r.meal_date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            return formattedDate === date;
        }) || null;

        res.json({
            success: true,
            data: {
                today: todayRecord,
                history: history
            }
        });
    } catch (error) {
        next(error);
    }
};

const saveTenantMeals = async (req, res, next) => {
    try {
        const {
            tenantId,
            institutionId,
            mealDate,
            breakfast,
            lunch,
            dinner,
            fullDayLeave,
            vacation,
            reason
        } = req.body;

        if (!tenantId || !institutionId || !mealDate) {
            return res.status(400).json({ success: false, message: "Tenant ID, Institution ID, and Date are required" });
        }

        const now = new Date();
        const mealTimeLimit = new Date(`${mealDate}T23:59:59`);

        if (now > mealTimeLimit) {
            return res.status(400).json({ success: false, message: "Cannot edit meal preferences for a past date" });
        }

        const record = await model.saveMealRecord({
            institutionId,
            tenantId,
            mealDate,
            breakfast,
            lunch,
            dinner,
            fullDayLeave,
            vacation,
            reason,
            userId: null
        });

        res.json({ success: true, message: "Preferences saved successfully", data: record });
    } catch (error) {
        next(error);
    }
};

const getMonthlyReport = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const institutionId = resolveInstitutionId(req);

        if (!year || !month) {
            return res.status(400).json({ success: false, message: "Year and Month are required" });
        }
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const report = await model.getMonthlyMealReport(institutionId, parseInt(year), parseInt(month));
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

const getPortalSettings = async (req, res, next) => {
    try {
        const institutionId = resolveInstitutionId(req);
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const db = require("../Config/Database");
        const result = await db.query(
            "SELECT live_support_enabled, meal_tracker_enabled FROM portal_settings WHERE institution_id = $1",
            [institutionId]
        );

        let settings = result.rows[0];
        if (!settings) {
            settings = { live_support_enabled: true, meal_tracker_enabled: true };
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

const savePortalSettings = async (req, res, next) => {
    try {
        const institutionId = resolveInstitutionId(req);
        const { liveSupportEnabled, mealTrackerEnabled } = req.body;

        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const db = require("../Config/Database");
        const result = await db.query(`
            INSERT INTO portal_settings (institution_id, live_support_enabled, meal_tracker_enabled)
            VALUES ($1, $2, $3)
            ON CONFLICT (institution_id)
            DO UPDATE SET 
                live_support_enabled = EXCLUDED.live_support_enabled,
                meal_tracker_enabled = EXCLUDED.meal_tracker_enabled
            RETURNING live_support_enabled, meal_tracker_enabled
        `, [institutionId, liveSupportEnabled, mealTrackerEnabled]);

        res.json({ success: true, message: "Settings updated successfully", data: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

const saveActualStats = async (req, res, next) => {
    try {
        const {
            mealDate,
            breakfastCooked,
            breakfastLeft,
            lunchCooked,
            lunchLeft,
            dinnerCooked,
            dinnerLeft,
            actualDailyExpense
        } = req.body;
        const institutionId = resolveInstitutionId(req);

        if (!mealDate) {
            return res.status(400).json({ success: false, message: "Meal date is required" });
        }
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const stats = await model.saveActualStats({
            institutionId,
            mealDate,
            breakfastCooked,
            breakfastLeft,
            lunchCooked,
            lunchLeft,
            dinnerCooked,
            dinnerLeft,
            actualDailyExpense
        });

        res.json({ success: true, message: "Cooked & Leftover stats saved successfully", data: stats });
    } catch (error) {
        next(error);
    }
};

const getDayWiseReport = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const institutionId = resolveInstitutionId(req);

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: "Start date and End date are required" });
        }
        if (!institutionId) {
            return res.status(400).json({ success: false, message: "Institution ID is required" });
        }

        const report = await model.getDayWiseMealReport(institutionId, startDate, endDate);
        res.json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDailySummary,
    listDailyMeals,
    updateMealEntry,
    bulkUpdateMealEntries,
    verifyTenantPhone,
    getTenantMeals,
    saveTenantMeals,
    getMonthlyReport,
    getPortalSettings,
    savePortalSettings,
    saveActualStats,
    getDayWiseReport
};
