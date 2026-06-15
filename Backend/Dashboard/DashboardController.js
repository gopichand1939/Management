const {
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
} = require("./DashboardModel");

const getDashboardOverview = async (req, res) => {
    try {
        const institutionId = req.user?.role === "pg_admin" ? req.user.institution_id : null;

        // Fetch all dashboard analytics concurrently
        const [
            overviewStats,
            revenueStats,
            institutionWise,
            floorWise,
            roomWise,
            bedStatusChart,
            tenantStatusChart,
            monthlyTrends,
            recentActivities,
            recentPayments,
            upcomingVacations,
            availableBeds,
        ] = await Promise.all([
            getDashboardOverviewStats(institutionId),
            getDashboardRevenueStats(institutionId),
            getInstitutionWiseStats(institutionId),
            getFloorWiseStats(institutionId),
            getRoomWiseStats(institutionId),
            getBedStatusChartData(institutionId),
            getTenantStatusChartData(institutionId),
            getMonthlyTrends(institutionId),
            getRecentTenantActivities(institutionId),
            getRecentPayments(institutionId),
            getUpcomingVacations(institutionId),
            getAvailableBeds(institutionId),
        ]);

        const totalBeds = Number(overviewStats?.total_beds || 0);
        const occupiedBeds = Number(overviewStats?.occupied_beds || 0);
        const vacantBeds = Number(overviewStats?.vacant_beds || 0);

        const occupancy_percentage = totalBeds > 0
            ? Number(((occupiedBeds / totalBeds) * 100).toFixed(2))
            : 0;
        const vacancy_percentage = totalBeds > 0
            ? Number(((vacantBeds / totalBeds) * 100).toFixed(2))
            : 0;

        // Split and parse monthly trends
        const monthly_occupancy_trend = (monthlyTrends || []).map((trend) => ({
            month: trend.month,
            occupied_beds: Number(trend.occupied_beds || 0),
        }));

        const monthly_revenue_trend = (monthlyTrends || []).map((trend) => ({
            month: trend.month,
            revenue: Number(trend.revenue || 0),
        }));

        const dashboard = {
            total_institutions: Number(overviewStats?.total_institutions || 0),
            total_floors: Number(overviewStats?.total_floors || 0),
            total_rooms: Number(overviewStats?.total_rooms || 0),
            total_beds: totalBeds,
            occupied_beds: occupiedBeds,
            vacant_beds: vacantBeds,
            reserved_beds: Number(overviewStats?.reserved_beds || 0),
            maintenance_beds: Number(overviewStats?.maintenance_beds || 0),

            total_tenants: Number(overviewStats?.total_tenants || 0),
            active_tenants: Number(overviewStats?.active_tenants || 0),
            pending_verification_tenants: Number(overviewStats?.pending_verification_tenants || 0),
            vacated_tenants: Number(overviewStats?.vacated_tenants || 0),

            occupancy_percentage,
            vacancy_percentage,

            total_monthly_revenue: Number(revenueStats?.total_monthly_revenue || 0),
            collected_payments: Number(revenueStats?.collected_payments || 0),
            pending_payments: Number(revenueStats?.pending_payments || 0),
            overdue_payments: Number(revenueStats?.overdue_payments || 0),

            institution_wise_stats: (institutionWise || []).map((inst) => ({
                institution_id: inst.institution_id,
                institution_name: inst.institution_name,
                total_rooms: Number(inst.total_rooms || 0),
                total_beds: Number(inst.total_beds || 0),
                occupied_beds: Number(inst.occupied_beds || 0),
                vacant_beds: Number(inst.vacant_beds || 0),
                occupancy_percentage: Number(inst.occupancy_percentage || 0),
            })),

            floor_wise_stats: (floorWise || []).map((floor) => ({
                floor_id: floor.floor_id,
                floor_name: floor.floor_name,
                total_rooms: Number(floor.total_rooms || 0),
                total_beds: Number(floor.total_beds || 0),
                occupied_beds: Number(floor.occupied_beds || 0),
                vacant_beds: Number(floor.vacant_beds || 0),
            })),

            room_wise_stats: (roomWise || []).map((room) => ({
                room_id: room.room_id,
                room_number: room.room_number,
                total_beds: Number(room.total_beds || 0),
                occupied_beds: Number(room.occupied_beds || 0),
                vacant_beds: Number(room.vacant_beds || 0),
            })),

            bed_status_chart: (bedStatusChart || []).map((item) => ({
                status: item.status,
                count: Number(item.count || 0),
            })),

            tenant_status_chart: (tenantStatusChart || []).map((item) => ({
                status: item.status,
                count: Number(item.count || 0),
            })),

            monthly_occupancy_trend,
            monthly_revenue_trend,

            recent_tenant_activities: (recentActivities || []).map((act) => ({
                id: act.id,
                tenant_id: act.tenant_id,
                tenant_name: act.tenant_name,
                action: act.action,
                created_at: act.created_at,
                new_value: act.new_value,
            })),

            recent_payments: (recentPayments || []).map((pmt) => ({
                id: pmt.id,
                tenant_id: pmt.tenant_id,
                tenant_name: pmt.tenant_name,
                amount: Number(pmt.amount || 0),
                payment_type: pmt.payment_type,
                payment_mode: pmt.payment_mode,
                payment_date: pmt.payment_date,
                status: pmt.status,
                verification_status: pmt.verification_status,
                receipt_number: pmt.receipt_number,
            })),

            upcoming_vacations: (upcomingVacations || []).map((vac) => ({
                id: vac.id,
                full_name: vac.full_name,
                expected_checkout_date: vac.expected_checkout_date,
                status: vac.status,
                room_id: vac.room_id,
                bed_id: vac.bed_id,
            })),

            available_beds: (availableBeds || []).map((bed) => ({
                id: bed.id,
                bed_number: bed.bed_number,
                bed_type: bed.bed_type,
                room_number: bed.room_number,
                floor_name: bed.floor_name,
                institution_name: bed.institution_name,
            })),
        };

        return res.status(200).json({
            success: true,
            message: "Dashboard analytics fetched successfully",
            dashboard,
        });
    } catch (error) {
        console.error("Dashboard overview retrieval failed:", error);
        return res.status(500).json({
            success: false,
            message: "Dashboard analytics retrieval failed",
        });
    }
};

module.exports = {
    getDashboardOverview,
};
