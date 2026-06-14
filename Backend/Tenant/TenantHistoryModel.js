const pool = require("../Config/Database");

const addDays = (value, days) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setDate(date.getDate() + days);

    return date;
};

const getLocalDateParts = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
    };
};

const formatLocalDateString = (year, month, day) => {
    const normalizedMonth = String(month + 1).padStart(2, "0");
    const normalizedDay = String(day).padStart(2, "0");

    return `${year}-${normalizedMonth}-${normalizedDay}`;
};

const getMonthKey = (value) => {
    const parts = getLocalDateParts(value);

    if (!parts) {
        return null;
    }

    return `${parts.year}-${String(parts.month + 1).padStart(2, "0")}`;
};

const getFirstDayOfNextMonth = (value) => {
    const parts = getLocalDateParts(value);

    if (!parts) {
        return null;
    }

    const nextMonth = parts.month === 11 ? 0 : parts.month + 1;
    const nextMonthYear = parts.month === 11 ? parts.year + 1 : parts.year;

    return formatLocalDateString(nextMonthYear, nextMonth, 1);
};

const addMonthsClamped = (value, monthsToAdd) => {
    const parts = getLocalDateParts(value);

    if (!parts) {
        return null;
    }

    const targetMonthIndex = parts.month + monthsToAdd;
    const targetYear = parts.year + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const targetDay = Math.min(parts.day, daysInTargetMonth);

    return formatLocalDateString(targetYear, normalizedMonth, targetDay);
};

const getTenantHistoryById = async (tenantId) => {
    const tenantResult = await pool.query(`
        SELECT
            tenants.id,
            tenants.institution_id,
            tenants.floor_id,
            tenants.room_id,
            tenants.bed_id,
            tenants.admission_number,
            tenants.full_name,
            tenants.phone,
            tenants.email,
            tenants.gender,
            tenants.date_of_birth,
            tenants.occupation,
            tenants.company_name,
            tenants.address,
            tenants.city,
            tenants.state,
            tenants.pincode,
            tenants.check_in_date,
            tenants.expected_checkout_date,
            tenants.guardian_name,
            tenants.guardian_phone,
            tenants.guardian_relation,
            tenants.emergency_contact_name,
            tenants.emergency_contact_phone,
            tenants.profile_photo,
            tenants.aadhaar_number,
            tenants.notes,
            tenants.status,
            tenants.security_deposit,
            tenants.deposit_paid,
            tenants.refundable_amount,
            tenants.deposit_refund_status,
            tenants.agreed_monthly_rent,
            tenants.checkout_date,
            tenants.notice_date,
            tenants.billing_cycle_type,
            tenants.billing_cycle_anchor_day,
            tenants.first_cycle_start_date,
            tenants.first_cycle_end_date,
            tenants.first_cycle_amount,
            tenants.created_at,
            tenants.updated_at,
            institutions.institution_name,
            institutions.institution_code,
            institutions.institution_type,
            floors.floor_name,
            floors.floor_number,
            rooms.room_number,
            rooms.room_type,
            rooms.capacity,
            rooms.rent_amount,
            rooms.attached_bathroom,
            beds.bed_number,
            beds.bed_type,
            beds.status AS bed_status
        FROM tenants
        INNER JOIN institutions
            ON institutions.id = tenants.institution_id
        LEFT JOIN floors
            ON floors.id = tenants.floor_id
        LEFT JOIN rooms
            ON rooms.id = tenants.room_id
        LEFT JOIN beds
            ON beds.id = tenants.bed_id
        WHERE tenants.id = $1
          AND tenants.deleted_at IS NULL
        LIMIT 1
    `, [tenantId]);

    const tenant = tenantResult.rows[0];

    if (!tenant) {
        return null;
    }

    const [documentsResult, paymentsResult, duesResult, activityResult] = await Promise.all([
        pool.query(`
            SELECT
                id,
                tenant_id,
                institution_id,
                document_name,
                document_type,
                document_number,
                file_name,
                file_url,
                mime_type,
                uploaded_by,
                uploaded_at
            FROM tenant_documents
            WHERE tenant_id = $1
            ORDER BY uploaded_at ASC, id ASC
        `, [tenantId]),
        pool.query(`
            SELECT
                id,
                tenant_id,
                institution_id,
                amount,
                payment_type,
                payment_mode,
                payment_date,
                reference_number,
                receipt_number,
                payment_proof_url,
                payment_proof_uploaded_at,
                verification_status,
                verified_by,
                verified_at,
                notes,
                status,
                paid_amount,
                due_amount,
                created_by,
                created_at
            FROM tenant_payments
            WHERE tenant_id = $1
            ORDER BY payment_date ASC NULLS LAST, id ASC
        `, [tenantId]),
        pool.query(`
            SELECT
                id,
                tenant_id,
                institution_id,
                due_month,
                due_date,
                cycle_start_date,
                cycle_end_date,
                total_rent,
                paid_amount,
                pending_amount,
                status,
                created_at,
                updated_at
            FROM tenant_monthly_dues
            WHERE tenant_id = $1
            ORDER BY due_month ASC, id ASC
        `, [tenantId]),
        pool.query(`
            SELECT
                id,
                action,
                performed_by,
                old_value,
                new_value,
                created_at
            FROM tenant_activity_logs
            WHERE tenant_id = $1
            ORDER BY created_at DESC, id DESC
        `, [tenantId]),
    ]);

    const documents = documentsResult.rows;
    const payments = paymentsResult.rows;
    const dues = duesResult.rows;
    const activity_logs = activityResult.rows;

    const onboardingPayment = payments.find((payment) => {
        return ["admission", "deposit", "rent"].includes(String(payment.payment_type || "").toLowerCase());
    }) || null;

    const latestPayment = payments.length ? payments[payments.length - 1] : null;
    const nextCycleBaseDate =
        latestPayment?.payment_date ||
        onboardingPayment?.payment_date ||
        tenant.check_in_date ||
        null;
    const nextCycleDate =
        tenant.billing_cycle_type === "calendar_month_prorated"
            ? getFirstDayOfNextMonth(nextCycleBaseDate)
            : addMonthsClamped(nextCycleBaseDate, 1);
    const nextCycleMonthKey = getMonthKey(nextCycleDate);
    const validFutureDues = dues.filter((due) => {
        if (Number(due.pending_amount || 0) <= 0) {
            return false;
        }

        const dueMonthKey = getMonthKey(due.due_month || due.due_date);

        if (!dueMonthKey || !nextCycleMonthKey) {
            return false;
        }

        return dueMonthKey >= nextCycleMonthKey;
    });
    const nextDue = validFutureDues[0] || null;
    const expectedMonthlyAmount =
        Number(tenant.agreed_monthly_rent || 0) ||
        Number(tenant.rent_amount || 0) ||
        Number(onboardingPayment?.amount || 0) ||
        Number(nextDue?.total_rent || 0) ||
        0;
    const upcomingCycle = nextCycleDate ? {
        due_date: nextCycleDate,
        due_month: nextCycleDate,
        expected_amount: expectedMonthlyAmount,
        based_on_payment_date: nextCycleBaseDate,
        billing_cycle_type: tenant.billing_cycle_type || "anniversary",
        first_cycle_start_date: tenant.first_cycle_start_date,
        first_cycle_end_date: tenant.first_cycle_end_date,
        first_cycle_amount: Number(tenant.first_cycle_amount || 0),
        status: "upcoming",
    } : null;

    const totalPaidAmount = payments.reduce((sum, payment) => {
        return sum + Number(payment.paid_amount || payment.amount || 0);
    }, 0);

    const totalPendingDueAmount = dues.reduce((sum, due) => {
        return sum + Number(due.pending_amount || 0);
    }, 0);
    const displayPendingDueAmount = validFutureDues.reduce((sum, due) => {
        return sum + Number(due.pending_amount || 0);
    }, 0);

    return {
        tenant,
        onboarding_assets: {
            profile_photo: tenant.profile_photo || null,
            documents,
        },
        payment_timeline: {
            onboarding_payment: onboardingPayment,
            latest_payment: latestPayment,
            total_paid_amount: totalPaidAmount,
            payments,
        },
        dues_summary: {
            total_pending_due_amount: totalPendingDueAmount,
            display_pending_due_amount: displayPendingDueAmount,
            next_due: nextDue,
            upcoming_cycle: upcomingCycle,
            dues,
        },
        activity_logs,
    };
};

module.exports = {
    getTenantHistoryById,
};
