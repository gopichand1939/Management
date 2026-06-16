const pool = require("../Config/Database");
const {
    generateAdmissionNumber,
    generateReceiptNumber,
    inferBedStatusFromTenantStatus,
    normalizeInteger,
    normalizeNumber,
} = require("./TenantHelpers");

const tenantBaseSelectQuery = `
    SELECT
        tenants.*,
        institutions.institution_name,
        institutions.institution_code,
        floors.floor_name,
        floors.floor_number,
        rooms.room_number,
        rooms.room_type,
        rooms.capacity,
        rooms.rent_amount AS room_rent_amount,
        rooms.occupied_beds AS room_occupied_beds,
        rooms.vacant_beds AS room_vacant_beds,
        beds.bed_number,
        beds.bed_type,
        beds.status AS bed_status,
        latest_tenant_payment.id AS latest_payment_id,
        latest_tenant_payment.amount AS latest_payment_amount,
        latest_tenant_payment.payment_type AS latest_payment_type,
        latest_tenant_payment.status AS latest_payment_status,
        latest_tenant_payment.verification_status AS latest_payment_verification_status,
        latest_tenant_payment.payment_date AS latest_payment_date,
        latest_tenant_payment.reference_number AS latest_payment_reference_number,
        tenants.billing_cycle_type,
        tenants.billing_cycle_anchor_day,
        tenants.first_cycle_start_date,
        tenants.first_cycle_end_date,
        tenants.first_cycle_amount
    FROM tenants
    INNER JOIN institutions
        ON institutions.id = tenants.institution_id
    LEFT JOIN floors
        ON floors.id = tenants.floor_id
    LEFT JOIN rooms
        ON rooms.id = tenants.room_id
    LEFT JOIN beds
        ON beds.id = tenants.bed_id
    LEFT JOIN LATERAL (
        SELECT
            tenant_payments.id,
            tenant_payments.amount,
            tenant_payments.payment_type,
            tenant_payments.status,
            tenant_payments.verification_status,
            tenant_payments.payment_date,
            tenant_payments.reference_number
        FROM tenant_payments
        WHERE tenant_payments.tenant_id = tenants.id
        ORDER BY tenant_payments.payment_date DESC NULLS LAST, tenant_payments.id DESC
        LIMIT 1
    ) AS latest_tenant_payment
        ON TRUE
`;

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
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

const getLastDayOfMonth = (value) => {
    const parts = getLocalDateParts(value);

    if (!parts) {
        return null;
    }

    return formatLocalDateString(
        parts.year,
        parts.month,
        new Date(parts.year, parts.month + 1, 0).getDate()
    );
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

const addDaysLocal = (value, daysToAdd) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setDate(date.getDate() + daysToAdd);

    return formatLocalDateString(date.getFullYear(), date.getMonth(), date.getDate());
};

const getDaysInMonth = (value) => {
    const parts = getLocalDateParts(value);

    if (!parts) {
        return 0;
    }

    return new Date(parts.year, parts.month + 1, 0).getDate();
};

const getInclusiveDaySpan = (startValue, endValue) => {
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return 0;
    }

    const diffInMs = endDate.getTime() - startDate.getTime();

    return Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;
};

const roundCurrency = (value) => {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
};

const buildTenantDueSchedule = (tenant, rentAmount) => {
    const normalizedRent =
        normalizeNumber(tenant.agreed_monthly_rent) || 0;
    const checkInDate = tenant.check_in_date;
    const billingCycleType = tenant.billing_cycle_type || "anniversary";

    if (!normalizedRent || !checkInDate) {
        return [];
    }

    if (billingCycleType === "calendar_month_prorated") {
        const firstCycleEndDate = getLastDayOfMonth(checkInDate);
        const firstCycleDays = getInclusiveDaySpan(checkInDate, firstCycleEndDate);
        const daysInMonth = getDaysInMonth(checkInDate);
        const firstCycleAmount = roundCurrency((normalizedRent / daysInMonth) * firstCycleDays);
        const nextCycleStartDate = getFirstDayOfNextMonth(checkInDate);
        const nextCycleEndDate = getLastDayOfMonth(nextCycleStartDate);

        return [
            {
                due_month: checkInDate,
                due_date: checkInDate,
                cycle_start_date: checkInDate,
                cycle_end_date: firstCycleEndDate,
                total_rent: firstCycleAmount,
            },
            {
                due_month: nextCycleStartDate,
                due_date: nextCycleStartDate,
                cycle_start_date: nextCycleStartDate,
                cycle_end_date: nextCycleEndDate,
                total_rent: normalizedRent,
            },
        ];
    }

    const currentCycleEndDate = addDaysLocal(addMonthsClamped(checkInDate, 1), -1);
    const nextCycleStartDate = addMonthsClamped(checkInDate, 1);
    const nextCycleEndDate = addDaysLocal(addMonthsClamped(checkInDate, 2), -1);

    return [
        {
            due_month: checkInDate,
            due_date: checkInDate,
            cycle_start_date: checkInDate,
            cycle_end_date: currentCycleEndDate,
            total_rent: normalizedRent,
        },
        {
            due_month: nextCycleStartDate,
            due_date: nextCycleStartDate,
            cycle_start_date: nextCycleStartDate,
            cycle_end_date: nextCycleEndDate,
            total_rent: normalizedRent,
        },
    ];
};

const mapTenantInsertValues = (data) => {
    return [
        data.institution_id,
        data.floor_id || null,
        data.room_id || null,
        data.bed_id || null,
        data.admission_number || null,
        data.full_name,
        data.phone || null,
        data.email || null,
        data.gender || null,
        data.date_of_birth || null,
        data.occupation || null,
        data.company_name || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.pincode || null,
        data.check_in_date || null,
        data.expected_checkout_date || null,
        data.guardian_name || null,
        data.guardian_phone || null,
        data.guardian_relation || null,
        data.emergency_contact_name || null,
        data.emergency_contact_phone || null,
        JSON.stringify(data.legacy_documents || []),
        JSON.stringify(data.profile_photo || null),
        data.aadhaar_number || null,
        data.notes || null,
        data.status || "active",
        data.security_deposit || 0,
        data.deposit_paid || 0,
        data.refundable_amount || 0,
        data.deposit_refund_status || "pending",
        data.billing_cycle_type || "anniversary",
        normalizeInteger(data.billing_cycle_anchor_day) || null,
        data.first_cycle_start_date || null,
        data.first_cycle_end_date || null,
        data.first_cycle_amount || 0,
        data.agreed_monthly_rent || 0,
        data.created_by || null,
    ];
};

const buildTenantSearchConditions = (
    institutionId = null,
    search = "",
    statuses = [],
    values = [],
    alias = "tenants"
) => {
    const whereConditions = [`${alias}.deleted_at IS NULL`];

    if (institutionId) {
        values.push(institutionId);
        whereConditions.push(`${alias}.institution_id = $${values.length}`);
    }

    if (statuses.length > 0) {
        values.push(statuses);
        whereConditions.push(`${alias}.status = ANY($${values.length})`);
    }

    if (search) {
        values.push(`%${String(search).trim().toLowerCase()}%`);
        whereConditions.push(`
            (
                LOWER(COALESCE(${alias}.full_name, '')) LIKE $${values.length}
                OR LOWER(COALESCE(${alias}.phone, '')) LIKE $${values.length}
                OR LOWER(COALESCE(${alias}.email, '')) LIKE $${values.length}
                OR LOWER(COALESCE(${alias}.admission_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(rooms.room_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(beds.bed_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(${alias}.aadhaar_number, '')) LIKE $${values.length}
            )
        `);
    }

    return whereConditions;
};

const findBedWithHierarchyById = async (bedId) => {
    const query = `
        SELECT
            beds.*,
            rooms.room_number,
            rooms.room_type,
            rooms.capacity,
            rooms.rent_amount,
            floors.floor_name,
            floors.floor_number,
            institutions.institution_name
        FROM beds
        INNER JOIN rooms
            ON rooms.id = beds.room_id
        INNER JOIN floors
            ON floors.id = beds.floor_id
        INNER JOIN institutions
            ON institutions.id = beds.institution_id
        WHERE beds.id = $1
    `;

    const result = await pool.query(query, [bedId]);

    return result.rows[0];
};

const findTenantById = async (id) => {
    const result = await pool.query(
        `${tenantBaseSelectQuery} WHERE tenants.id = $1 AND tenants.deleted_at IS NULL`,
        [id]
    );

    return result.rows[0];
};

const getTenantDocuments = async (tenantId) => {
    const result = await pool.query(`
        SELECT *
        FROM tenant_documents
        WHERE tenant_id = $1
        ORDER BY uploaded_at DESC, id DESC
    `, [tenantId]);

    return result.rows;
};

const getTenantPaymentsByTenantId = async (tenantId) => {
    const result = await pool.query(`
        SELECT *
        FROM tenant_payments
        WHERE tenant_id = $1
        ORDER BY payment_date DESC NULLS LAST, id DESC
    `, [tenantId]);

    return result.rows;
};

const getTenantActivityLogs = async (tenantId) => {
    const result = await pool.query(`
        SELECT *
        FROM tenant_activity_logs
        WHERE tenant_id = $1
        ORDER BY created_at DESC, id DESC
    `, [tenantId]);

    return result.rows;
};

const getTenantDueLedger = async (tenantId) => {
    const result = await pool.query(`
        SELECT *
        FROM tenant_monthly_dues
        WHERE tenant_id = $1
        ORDER BY due_month DESC, id DESC
    `, [tenantId]);

    return result.rows;
};

const attachTenantBedAllocation = (tenant) => {
    if (!tenant) {
        return tenant;
    }

    return {
        ...tenant,
        bed_allocation: {
            institution: tenant.institution_id ? {
                id: tenant.institution_id,
                name: tenant.institution_name,
                code: tenant.institution_code || null,
            } : null,
            floor: tenant.floor_id ? {
                id: tenant.floor_id,
                name: tenant.floor_name,
                number: tenant.floor_number,
            } : null,
            room: tenant.room_id ? {
                id: tenant.room_id,
                number: tenant.room_number,
                type: tenant.room_type,
                capacity: tenant.capacity,
                rent_amount: tenant.room_rent_amount,
                occupied_beds: tenant.room_occupied_beds,
                vacant_beds: tenant.room_vacant_beds,
            } : null,
            bed: tenant.bed_id ? {
                id: tenant.bed_id,
                number: tenant.bed_number,
                type: tenant.bed_type,
                status: tenant.bed_status,
            } : null,
        },
    };
};

const getTenantByIdWithPayments = async (id) => {
    const tenant = await findTenantById(id);

    if (!tenant) {
        return null;
    }

    const [documents, payments, activity_logs, dues] = await Promise.all([
        getTenantDocuments(id),
        getTenantPaymentsByTenantId(id),
        getTenantActivityLogs(id),
        getTenantDueLedger(id),
    ]);

    return attachTenantBedAllocation({
        ...tenant,
        documents,
        payments,
        activity_logs,
        dues,
    });
};

const logTenantActivity = async (
    client,
    tenantId,
    institutionId,
    action,
    performedBy,
    oldValue = null,
    newValue = null
) => {
    await client.query(`
        INSERT INTO tenant_activity_logs (
            tenant_id,
            institution_id,
            action,
            performed_by,
            old_value,
            new_value
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
    `, [
        tenantId,
        institutionId,
        action,
        performedBy || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
    ]);
};

const reconcileBedOccupancy = async (client, institutionId = null) => {
    const values = [];
    const bedScope = ["status <> 'maintenance'"];
    const tenantScope = [
        "deleted_at IS NULL",
        "bed_id IS NOT NULL",
        "status <> 'vacated'",
    ];

    if (institutionId) {
        values.push(institutionId);
        bedScope.push(`institution_id = $${values.length}`);
        tenantScope.push(`institution_id = $${values.length}`);
    }

    await client.query(`
        UPDATE beds
        SET status = 'vacant'
        WHERE ${bedScope.join(" AND ")}
    `, values);

    await client.query(`
        UPDATE beds
        SET status = tenant_bed_status.next_status
        FROM (
            SELECT
                tenants.bed_id,
                CASE
                    WHEN tenants.status IN ('draft') THEN 'reserved'
                    WHEN tenants.status IN (
                        'pending_verification',
                        'active',
                        'notice_period'
                    )
                        THEN 'occupied'
                    ELSE 'vacant'
                END AS next_status
            FROM tenants
            WHERE ${tenantScope.join(" AND ")}
        ) AS tenant_bed_status
        WHERE beds.id = tenant_bed_status.bed_id
          AND beds.status <> 'maintenance'
    `, values);
};

const syncOccupancyStats = async (client, institutionId) => {
    await reconcileBedOccupancy(client, institutionId);

    await client.query(`
        UPDATE rooms
        SET
            occupied_beds = room_stats.occupied_beds,
            vacant_beds = room_stats.vacant_beds
        FROM (
            SELECT
                rooms.id AS room_id,
                COUNT(beds.id) FILTER (WHERE beds.status = 'occupied') AS occupied_beds,
                COUNT(beds.id) FILTER (WHERE beds.status = 'vacant') AS vacant_beds
            FROM rooms
            LEFT JOIN beds
                ON beds.room_id = rooms.id
            ${institutionId ? "WHERE rooms.institution_id = $1" : ""}
            GROUP BY rooms.id
        ) AS room_stats
        WHERE rooms.id = room_stats.room_id
    `, institutionId ? [institutionId] : []);

    await client.query(`
        UPDATE floors
        SET
            total_rooms = floor_stats.total_rooms,
            total_beds = floor_stats.total_beds,
            occupied_beds = floor_stats.occupied_beds,
            vacant_beds = floor_stats.vacant_beds
        FROM (
            SELECT
                floors.id AS floor_id,
                COUNT(DISTINCT rooms.id) AS total_rooms,
                COUNT(DISTINCT beds.id) AS total_beds,
                COUNT(DISTINCT beds.id) FILTER (WHERE beds.status = 'occupied') AS occupied_beds,
                COUNT(DISTINCT beds.id) FILTER (WHERE beds.status = 'vacant') AS vacant_beds
            FROM floors
            LEFT JOIN rooms
                ON rooms.floor_id = floors.id
            LEFT JOIN beds
                ON beds.room_id = rooms.id
            ${institutionId ? "WHERE floors.institution_id = $1" : ""}
            GROUP BY floors.id
        ) AS floor_stats
        WHERE floors.id = floor_stats.floor_id
    `, institutionId ? [institutionId] : []);
};

const replaceTenantDocuments = async (client, tenantId, institutionId, documents, uploadedBy) => {
    await client.query(`
        DELETE FROM tenant_documents
        WHERE tenant_id = $1
    `, [tenantId]);

    if (!documents.length) {
        return;
    }

    for (const document of documents) {
        await client.query(`
            INSERT INTO tenant_documents (
                tenant_id,
                institution_id,
                document_name,
                document_type,
                document_number,
                file_name,
                file_url,
                mime_type,
                uploaded_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            tenantId,
            institutionId,
            document.document_name,
            document.document_type,
            document.document_number || null,
            document.file_name || null,
            document.file_url || null,
            document.mime_type || null,
            uploadedBy || null,
        ]);
    }
};

const validateDuplicateTenant = async (
    client,
    { phone, email, aadhaar_number, id = null }
) => {
    const duplicatesResult = await client.query(`
        SELECT id, phone, email, aadhaar_number
        FROM tenants
        WHERE deleted_at IS NULL
          AND ($1::int IS NULL OR id <> $1)
          AND (
            ($2::varchar IS NOT NULL AND phone = $2)
            OR ($3::varchar IS NOT NULL AND LOWER(email) = LOWER($3))
            OR ($4::varchar IS NOT NULL AND aadhaar_number = $4)
          )
        LIMIT 1
    `, [
        id,
        phone || null,
        email || null,
        aadhaar_number || null,
    ]);

    const duplicate = duplicatesResult.rows[0];

    if (!duplicate) {
        return;
    }

    if (phone && duplicate.phone === phone) {
        throw Object.assign(new Error("Phone number already exists"), {
            code: "DUPLICATE_PHONE",
        });
    }

    if (email && duplicate.email && String(duplicate.email).toLowerCase() === String(email).toLowerCase()) {
        throw Object.assign(new Error("Email already exists"), {
            code: "DUPLICATE_EMAIL",
        });
    }

    if (aadhaar_number && duplicate.aadhaar_number === aadhaar_number) {
        throw Object.assign(new Error("Aadhaar number already exists"), {
            code: "DUPLICATE_AADHAAR",
        });
    }
};

const lockAndValidateBed = async (client, data) => {
    const bedResult = await client.query(`
        SELECT
            beds.*,
            rooms.rent_amount
        FROM beds
        INNER JOIN rooms
            ON rooms.id = beds.room_id
        WHERE beds.id = $1
          AND beds.institution_id = $2
          AND beds.floor_id = $3
          AND beds.room_id = $4
        FOR UPDATE
    `, [
        data.bed_id,
        data.institution_id,
        data.floor_id,
        data.room_id,
    ]);

    const bed = bedResult.rows[0];

    if (!bed) {
        throw Object.assign(new Error("Selected bed does not exist"), {
            code: "BED_NOT_FOUND",
        });
    }

    if (String(bed.status).toLowerCase() === "maintenance") {
        throw Object.assign(new Error("Selected bed is under maintenance"), {
            code: "BED_UNDER_MAINTENANCE",
        });
    }

    if (String(bed.status).toLowerCase() !== "vacant") {
        throw Object.assign(new Error("Selected bed is not vacant"), {
            code: "BED_NOT_VACANT",
        });
    }

    return bed;
};

const createMonthlyDue = async (client, tenant, rentAmount) => {
    const dueSchedule = buildTenantDueSchedule(tenant, rentAmount);

    if (!dueSchedule.length) {
        return null;
    }

    let latestDue = null;

    for (const dueItem of dueSchedule) {
        const existingDueResult = await client.query(`
            SELECT id, pending_amount, total_rent
            FROM tenant_monthly_dues
            WHERE tenant_id = $1
              AND due_month = $2
            LIMIT 1
        `, [tenant.id, dueItem.due_month]);

        if (existingDueResult.rows[0]) {
            latestDue = existingDueResult.rows[0];
            continue;
        }

        const dueResult = await client.query(`
            INSERT INTO tenant_monthly_dues (
                tenant_id,
                institution_id,
                due_month,
                due_date,
                cycle_start_date,
                cycle_end_date,
                total_rent,
                paid_amount,
                pending_amount,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $7, 'pending')
            RETURNING *
        `, [
            tenant.id,
            tenant.institution_id,
            dueItem.due_month,
            dueItem.due_date,
            dueItem.cycle_start_date,
            dueItem.cycle_end_date,
            dueItem.total_rent,
        ]);

        latestDue = dueResult.rows[0];
    }

    return latestDue;
};

const applyPaymentToTenantDues = async (client, tenantId, paymentAmount) => {
    let remainingAmount = normalizeNumber(paymentAmount) || 0;

    if (remainingAmount <= 0) {
        return;
    }

    const dueRowsResult = await client.query(`
        SELECT *
        FROM tenant_monthly_dues
        WHERE tenant_id = $1
          AND pending_amount > 0
        ORDER BY due_month ASC, id ASC
        FOR UPDATE
    `, [tenantId]);

    for (const due of dueRowsResult.rows) {
        if (remainingAmount <= 0) {
            break;
        }

        const payableAmount = Math.min(Number(due.pending_amount), remainingAmount);
        const updatedPaidAmount = Number(due.paid_amount) + payableAmount;
        const updatedPendingAmount = Number(due.pending_amount) - payableAmount;

        await client.query(`
            UPDATE tenant_monthly_dues
            SET
                paid_amount = $2,
                pending_amount = $3,
                status = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [
            due.id,
            updatedPaidAmount,
            updatedPendingAmount,
            updatedPendingAmount <= 0 ? "paid" : "partial",
        ]);

        remainingAmount -= payableAmount;
    }
};

const reconcileVerifiedTenantStatuses = async (client, institutionId = null) => {
    const values = [];
    const institutionFilter = [];

    if (institutionId) {
        values.push(institutionId);
        institutionFilter.push(`tenants.institution_id = $${values.length}`);
    }

    const tenantsToPromoteResult = await client.query(`
        SELECT DISTINCT
            tenants.id,
            tenants.institution_id
        FROM tenants
        INNER JOIN tenant_payments
            ON tenant_payments.tenant_id = tenants.id
        WHERE tenants.deleted_at IS NULL
          AND LOWER(tenants.status) IN ('draft', 'pending_verification')
          AND LOWER(COALESCE(tenant_payments.verification_status, 'pending')) = 'verified'
          AND LOWER(COALESCE(tenant_payments.status, 'completed')) = 'completed'
          ${institutionFilter.length ? `AND ${institutionFilter.join(" AND ")}` : ""}
    `, values);

    for (const tenant of tenantsToPromoteResult.rows) {
        await promoteTenantToActiveIfEligible(
            client,
            tenant.id,
            null,
            {
                id: null,
                verification_status: "verified",
            }
        );
    }
};

const promoteTenantToActiveIfEligible = async (
    client,
    tenantId,
    verifiedBy,
    payment = null
) => {
    const tenantResult = await client.query(`
        SELECT *
        FROM tenants
        WHERE id = $1
          AND deleted_at IS NULL
        FOR UPDATE
    `, [tenantId]);

    const tenant = tenantResult.rows[0];

    if (!tenant) {
        return null;
    }

    if (!["pending_verification", "draft"].includes(String(tenant.status).toLowerCase())) {
        return tenant;
    }

    await client.query(`
        UPDATE tenants
        SET
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `, [tenantId]);

    if (tenant.bed_id) {
        await client.query(`
            UPDATE beds
            SET status = 'occupied'
            WHERE id = $1
        `, [tenant.bed_id]);
    }

    await logTenantActivity(
        client,
        tenantId,
        tenant.institution_id,
        "tenant_activated_after_payment",
        verifiedBy,
        {
            tenant_status: tenant.status,
            payment_verification_status: payment?.verification_status || null,
            payment_id: payment?.id || null,
        },
        {
            tenant_status: "active",
            payment_verification_status: "verified",
            payment_id: payment?.id || null,
        }
    );

    await syncOccupancyStats(client, tenant.institution_id);

    return {
        ...tenant,
        status: "active",
    };
};

const createTenantPayment = async (data, client = null) => {
    const queryRunner = client || pool;
    const receiptNumber = await generateReceiptNumber(queryRunner, data.institution_id);

    const query = `
        INSERT INTO tenant_payments (
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
            created_by
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18
        )
        RETURNING *
    `;

    const values = [
        data.tenant_id,
        data.institution_id,
        data.amount,
        data.payment_type || "rent",
        data.payment_mode || null,
        data.payment_date || null,
        data.reference_number || null,
        receiptNumber,
        data.payment_proof_url || null,
        data.payment_proof_url ? new Date() : null,
        data.verification_status || "pending",
        data.verified_by || (
            data.verification_status === "verified"
                ? (data.created_by || null)
                : null
        ),
        data.verified_at || (
            data.verification_status === "verified"
                ? new Date()
                : null
        ),
        data.notes || null,
        data.status || "completed",
        data.paid_amount ?? data.amount,
        data.due_amount ?? 0,
        data.created_by || null,
    ];

    const result = await queryRunner.query(query, values);
    const payment = result.rows[0];

    if (data.payment_type === "rent" || data.payment_type === "admission") {
        await applyPaymentToTenantDues(queryRunner, data.tenant_id, data.amount);
    }

    if (payment.verification_status === "verified") {
        await promoteTenantToActiveIfEligible(
            queryRunner,
            data.tenant_id,
            data.created_by || data.verified_by || null,
            payment
        );
    }

    return payment;
};

const createTenantOnboarding = async (data) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await validateDuplicateTenant(client, data);

        const bed = await lockAndValidateBed(client, data);
        const admissionNumber = await generateAdmissionNumber(client, data.institution_id);
        const initialDueSchedule = buildTenantDueSchedule(
            data,
            bed.rent_override || bed.rent_amount
        );
        const firstDue = initialDueSchedule[0] || null;
        const checkInParts = getLocalDateParts(data.check_in_date);

        const tenantInsertData = {
            ...data,
            admission_number: admissionNumber,
            refundable_amount: normalizeNumber(data.refundable_amount) ?? normalizeNumber(data.deposit_paid) ?? 0,
            agreed_monthly_rent: normalizeNumber(data.agreed_monthly_rent) || 0,
            billing_cycle_anchor_day:
                data.billing_cycle_type === "calendar_month_prorated"
                    ? 1
                    : checkInParts?.day || null,
            first_cycle_start_date: firstDue?.cycle_start_date || null,
            first_cycle_end_date: firstDue?.cycle_end_date || null,
            first_cycle_amount: firstDue?.total_rent || 0,
        };

        const tenantResult = await client.query(`
            INSERT INTO tenants (
                institution_id,
                floor_id,
                room_id,
                bed_id,
                admission_number,
                full_name,
                phone,
                email,
                gender,
                date_of_birth,
                occupation,
                company_name,
                address,
                city,
                state,
                pincode,
                check_in_date,
                expected_checkout_date,
                guardian_name,
                guardian_phone,
                guardian_relation,
                emergency_contact_name,
                emergency_contact_phone,
                documents,
                profile_photo,
                aadhaar_number,
                notes,
                status,
                security_deposit,
                deposit_paid,
                refundable_amount,
                deposit_refund_status,
                billing_cycle_type,
                billing_cycle_anchor_day,
                first_cycle_start_date,
                first_cycle_end_date,
                first_cycle_amount,
                agreed_monthly_rent,
                created_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24::jsonb, $25::jsonb, $26, $27, $28, $29,
                $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
            )
            RETURNING *
        `, mapTenantInsertValues(tenantInsertData));

        const tenant = tenantResult.rows[0];
        const nextBedStatus =
            [
                "pending_verification",
                "active",
                "notice_period",
            ].includes(String(tenant.status).toLowerCase())
                ? "occupied"
                : "vacant";

        await client.query(`
            UPDATE beds
            SET status = $2
            WHERE id = $1
        `, [data.bed_id, nextBedStatus]);

        await replaceTenantDocuments(
            client,
            tenant.id,
            tenant.institution_id,
            data.documents || [],
            data.created_by
        );

        await createMonthlyDue(client, tenant, bed.rent_override || bed.rent_amount);

        if (data.payment && data.payment.amount) {
            await createTenantPayment({
                tenant_id: tenant.id,
                institution_id: tenant.institution_id,
                amount: data.payment.amount,
                payment_type: data.payment.payment_type || "admission",
                payment_mode: data.payment.payment_mode || null,
                payment_date: data.payment.payment_date || null,
                reference_number: data.payment.reference_number || null,
                payment_proof_url: data.payment.payment_proof_url || null,
                verification_status: data.payment.verification_status || "pending",
                notes: data.payment.notes || null,
                status: data.payment.status || "completed",
                created_by: data.created_by || null,
            }, client);
        }

        await client.query(`
            INSERT INTO tenant_bed_history (
                tenant_id,
                institution_id,
                to_floor_id,
                to_room_id,
                to_bed_id,
                transfer_reason,
                transferred_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            tenant.id,
            tenant.institution_id,
            tenant.floor_id,
            tenant.room_id,
            tenant.bed_id,
            "Initial onboarding allocation",
            data.created_by || null,
        ]);

        await logTenantActivity(
            client,
            tenant.id,
            tenant.institution_id,
            "tenant_created",
            data.created_by,
            null,
            {
                admission_number: tenant.admission_number,
                bed_id: tenant.bed_id,
                status: tenant.status,
            }
        );

        await syncOccupancyStats(client, tenant.institution_id);
        await client.query("COMMIT");

        return getTenantByIdWithPayments(tenant.id);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const getActiveTenants = async (
    institutionId = null,
    search = "",
    statuses = ["active", "pending_verification", "notice_period"]
) => {
    await reconcileVerifiedTenantStatuses(pool, institutionId);

    const values = [];
    const whereConditions = buildTenantSearchConditions(
        institutionId,
        search,
        statuses,
        values
    );

    const result = await pool.query(`
        ${tenantBaseSelectQuery}
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY tenants.created_at DESC, tenants.id DESC
    `, values);

    return result.rows.map(attachTenantBedAllocation);
};

const getVacatedTenants = async (
    institutionId = null,
    search = "",
    statuses = ["vacated"]
) => {
    const values = [];
    const whereConditions = buildTenantSearchConditions(
        institutionId,
        search,
        statuses,
        values
    );

    const result = await pool.query(`
        ${tenantBaseSelectQuery}
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY tenants.checkout_date DESC NULLS LAST, tenants.updated_at DESC NULLS LAST, tenants.id DESC
    `, values);

    return result.rows.map(attachTenantBedAllocation);
};

const getVacantBeds = async (institutionId = null, search = "") => {
    const values = [];
    const whereConditions = [
        `EXISTS (
            SELECT 1
            FROM beds AS room_beds
            WHERE room_beds.room_id = beds.room_id
              AND LOWER(COALESCE(room_beds.status, 'vacant')) = 'vacant'
        )`,
    ];

    await syncOccupancyStats(pool, institutionId);

    if (institutionId) {
        values.push(institutionId);
        whereConditions.push(`beds.institution_id = $${values.length}`);
    }

    if (search) {
        values.push(`%${String(search).trim().toLowerCase()}%`);
        whereConditions.push(`
            (
                LOWER(COALESCE(institutions.institution_name, '')) LIKE $${values.length}
                OR LOWER(COALESCE(floors.floor_name, '')) LIKE $${values.length}
                OR LOWER(COALESCE(rooms.room_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(beds.bed_number, '')) LIKE $${values.length}
            )
        `);
    }

    const result = await pool.query(`
        SELECT
            beds.id,
            beds.institution_id,
            beds.floor_id,
            beds.room_id,
            beds.bed_number,
            beds.bed_type,
            beds.rent_override,
            beds.status,
            institutions.institution_name,
            floors.floor_name,
            floors.floor_number,
            floors.occupied_beds AS floor_occupied_beds,
            floors.vacant_beds AS floor_vacant_beds,
            rooms.room_number,
            rooms.room_type,
            rooms.capacity,
            rooms.rent_amount,
            rooms.occupied_beds AS room_occupied_beds,
            rooms.vacant_beds AS room_vacant_beds
        FROM beds
        INNER JOIN institutions
            ON institutions.id = beds.institution_id
        INNER JOIN floors
            ON floors.id = beds.floor_id
        INNER JOIN rooms
            ON rooms.id = beds.room_id
        ${whereConditions.length ? `WHERE ${whereConditions.join(" AND ")}` : ""}
        ORDER BY institutions.institution_name ASC, floors.floor_number ASC, rooms.room_number ASC, beds.bed_number ASC
    `, values);

    return result.rows;
};

const getTenantPayments = async (institutionId = null, search = "", tenantId = null) => {
    const values = [];
    const whereConditions = ["tenants.deleted_at IS NULL"];

    if (institutionId) {
        values.push(institutionId);
        whereConditions.push(`tenant_payments.institution_id = $${values.length}`);
    }

    if (tenantId) {
        values.push(tenantId);
        whereConditions.push(`tenant_payments.tenant_id = $${values.length}`);
    }

    if (search) {
        values.push(`%${String(search).trim().toLowerCase()}%`);
        whereConditions.push(`
            (
                LOWER(COALESCE(tenants.full_name, '')) LIKE $${values.length}
                OR LOWER(COALESCE(tenants.phone, '')) LIKE $${values.length}
                OR LOWER(COALESCE(tenant_payments.reference_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(tenant_payments.receipt_number, '')) LIKE $${values.length}
                OR LOWER(COALESCE(tenant_payments.payment_type, '')) LIKE $${values.length}
            )
        `);
    }

    const result = await pool.query(`
        SELECT
            tenant_payments.*,
            tenants.full_name,
            tenants.admission_number,
            tenants.phone,
            beds.bed_number,
            rooms.room_number,
            floors.floor_name,
            institutions.institution_name
        FROM tenant_payments
        INNER JOIN tenants
            ON tenants.id = tenant_payments.tenant_id
        INNER JOIN institutions
            ON institutions.id = tenant_payments.institution_id
        LEFT JOIN beds
            ON beds.id = tenants.bed_id
        LEFT JOIN rooms
            ON rooms.id = tenants.room_id
        LEFT JOIN floors
            ON floors.id = tenants.floor_id
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY tenant_payments.payment_date DESC NULLS LAST, tenant_payments.id DESC
    `, values);

    return result.rows;
};

const updateTenantOnboarding = async (data) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await validateDuplicateTenant(client, data);

        const existingTenantResult = await client.query(`
            SELECT *
            FROM tenants
            WHERE id = $1
              AND deleted_at IS NULL
            FOR UPDATE
        `, [data.id]);

        const existingTenant = existingTenantResult.rows[0];

        if (!existingTenant) {
            throw Object.assign(new Error("Tenant not found"), {
                code: "TENANT_NOT_FOUND",
            });
        }

        const isBedChanged = Number(existingTenant.bed_id) !== Number(data.bed_id);
        let nextBed = null;

        if (isBedChanged) {
            nextBed = await lockAndValidateBed(client, data);
        } else if (data.bed_id) {
            const currentBedResult = await client.query(`
                SELECT beds.*, rooms.rent_amount
                FROM beds
                INNER JOIN rooms
                    ON rooms.id = beds.room_id
                WHERE beds.id = $1
                FOR UPDATE
            `, [data.bed_id]);

            nextBed = currentBedResult.rows[0];
        }

        const updatedRefundableAmount = data.refundable_amount !== null &&
            data.refundable_amount !== undefined
            ? data.refundable_amount
            : normalizeNumber(data.deposit_paid) ?? normalizeNumber(existingTenant.deposit_paid) ?? 0;
        const updatedDueSchedule = buildTenantDueSchedule(
            data,
            nextBed?.rent_override || nextBed?.rent_amount || existingTenant.room_rent_amount
        );
        const updatedFirstDue = updatedDueSchedule[0] || null;
        const updatedCheckInParts = getLocalDateParts(
            data.check_in_date || existingTenant.check_in_date
        );

        await client.query(`
            UPDATE tenants
            SET
                institution_id = $1,
                floor_id = $2,
                room_id = $3,
                bed_id = $4,
                full_name = $5,
                phone = $6,
                email = $7,
                gender = $8,
                date_of_birth = $9,
                occupation = $10,
                company_name = $11,
                address = $12,
                city = $13,
                state = $14,
                pincode = $15,
                check_in_date = $16,
                expected_checkout_date = $17,
                guardian_name = $18,
                guardian_phone = $19,
                guardian_relation = $20,
                emergency_contact_name = $21,
                emergency_contact_phone = $22,
                documents = $23::jsonb,
                profile_photo = $24::jsonb,
                aadhaar_number = $25,
                notes = $26,
                status = $27,
                security_deposit = $28,
                deposit_paid = $29,
                refundable_amount = $30,
                deposit_refund_status = $31,
                billing_cycle_type = $32,
                billing_cycle_anchor_day = $33,
                first_cycle_start_date = $34,
                first_cycle_end_date = $35,
                first_cycle_amount = $36,
                agreed_monthly_rent = $37,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $38
            RETURNING *
        `, [
            data.institution_id,
            data.floor_id || null,
            data.room_id || null,
            data.bed_id || null,
            data.full_name,
            data.phone || null,
            data.email || null,
            data.gender || null,
            data.date_of_birth || null,
            data.occupation || null,
            data.company_name || null,
            data.address || null,
            data.city || null,
            data.state || null,
            data.pincode || null,
            data.check_in_date || null,
            data.expected_checkout_date || null,
            data.guardian_name || null,
            data.guardian_phone || null,
            data.guardian_relation || null,
            data.emergency_contact_name || null,
            data.emergency_contact_phone || null,
            JSON.stringify(data.legacy_documents || []),
            JSON.stringify(data.profile_photo || null),
            data.aadhaar_number || null,
            data.notes || null,
            data.status || existingTenant.status,
            data.security_deposit || 0,
            data.deposit_paid || 0,
            updatedRefundableAmount,
            data.deposit_refund_status || "pending",
            data.billing_cycle_type || existingTenant.billing_cycle_type || "anniversary",
            data.billing_cycle_type === "calendar_month_prorated"
                ? 1
                : updatedCheckInParts?.day || existingTenant.billing_cycle_anchor_day || null,
            updatedFirstDue?.cycle_start_date || existingTenant.first_cycle_start_date || null,
            updatedFirstDue?.cycle_end_date || existingTenant.first_cycle_end_date || null,
            updatedFirstDue?.total_rent || existingTenant.first_cycle_amount || 0,
            data.agreed_monthly_rent || 0,
            data.id,
        ]);

        const updatedTenant = existingTenantResult.rows[0];
        const nextBedStatus = inferBedStatusFromTenantStatus(data.status || existingTenant.status);

        if (isBedChanged && existingTenant.bed_id) {
            await client.query(`
                UPDATE beds
                SET status = 'vacant'
                WHERE id = $1
            `, [existingTenant.bed_id]);

            await client.query(`
                INSERT INTO tenant_bed_history (
                    tenant_id,
                    institution_id,
                    from_floor_id,
                    from_room_id,
                    from_bed_id,
                    to_floor_id,
                    to_room_id,
                    to_bed_id,
                    transfer_reason,
                    transferred_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                existingTenant.id,
                data.institution_id,
                existingTenant.floor_id,
                existingTenant.room_id,
                existingTenant.bed_id,
                data.floor_id,
                data.room_id,
                data.bed_id,
                data.transfer_reason || "Tenant record updated",
                data.created_by || null,
            ]);
        }

        if (data.bed_id) {
            await client.query(`
                UPDATE beds
                SET status = $2
                WHERE id = $1
            `, [
                data.bed_id,
                nextBedStatus,
            ]);
        }

        await replaceTenantDocuments(
            client,
            data.id,
            data.institution_id,
            data.documents || [],
            data.created_by
        );

        if (data.payment && (data.payment.amount !== null || data.payment.reference_number || data.payment.payment_proof_url)) {
            let paymentId = data.payment.id;
            if (!paymentId) {
                const existingPaymentResult = await client.query(`
                    SELECT id FROM tenant_payments
                    WHERE tenant_id = $1
                    ORDER BY id ASC
                    LIMIT 1
                `, [data.id]);
                paymentId = existingPaymentResult.rows[0]?.id;
            }

            if (paymentId) {
                await client.query(`
                    UPDATE tenant_payments
                    SET
                        amount = $1,
                        payment_type = $2,
                        payment_mode = $3,
                        payment_date = $4,
                        reference_number = $5,
                        payment_proof_url = $6,
                        notes = $7,
                        status = $8,
                        verification_status = $9,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $10 AND tenant_id = $11
                `, [
                    data.payment.amount,
                    data.payment.payment_type || 'admission',
                    data.payment.payment_mode || 'cash',
                    data.payment.payment_date || null,
                    data.payment.reference_number || null,
                    data.payment.payment_proof_url || null,
                    data.payment.notes || null,
                    data.payment.status || 'completed',
                    data.payment.verification_status || 'verified',
                    paymentId,
                    data.id
                ]);
            } else {
                await client.query(`
                    INSERT INTO tenant_payments (
                        tenant_id,
                        institution_id,
                        amount,
                        payment_type,
                        payment_mode,
                        payment_date,
                        reference_number,
                        payment_proof_url,
                        notes,
                        status,
                        verification_status,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    data.id,
                    data.institution_id,
                    data.payment.amount || 0,
                    data.payment.payment_type || 'admission',
                    data.payment.payment_mode || 'cash',
                    data.payment.payment_date || null,
                    data.payment.reference_number || null,
                    data.payment.payment_proof_url || null,
                    data.payment.notes || null,
                    data.payment.status || 'completed',
                    data.payment.verification_status || 'verified',
                    data.created_by
                ]);
            }
        }

        if (nextBed) {
            await createMonthlyDue(client, {
                id: data.id,
                institution_id: data.institution_id,
                check_in_date: data.check_in_date || existingTenant.check_in_date,
                billing_cycle_type: data.billing_cycle_type || existingTenant.billing_cycle_type || "anniversary",
            }, nextBed.rent_override || nextBed.rent_amount);
        }

        await logTenantActivity(
            client,
            data.id,
            data.institution_id,
            isBedChanged ? "tenant_room_changed" : "tenant_updated",
            data.created_by,
            {
                bed_id: existingTenant.bed_id,
                status: existingTenant.status,
            },
            {
                bed_id: data.bed_id,
                status: data.status,
            }
        );

        await syncOccupancyStats(client, data.institution_id);
        await client.query("COMMIT");

        return getTenantByIdWithPayments(data.id);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const verifyTenantPayment = async ({
    payment_id,
    tenant_id,
    verification_status,
    verified_by,
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const paymentResult = await client.query(`
            UPDATE tenant_payments
            SET
                verification_status = $2,
                verified_by = $3,
                verified_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND tenant_id = $4
            RETURNING *
        `, [
            payment_id,
            verification_status,
            verified_by || null,
            tenant_id,
        ]);

        const payment = paymentResult.rows[0];

        if (!payment) {
            await client.query("ROLLBACK");
            return null;
        }

        const tenantResult = await client.query(`
            SELECT *
            FROM tenants
            WHERE id = $1
              AND deleted_at IS NULL
            FOR UPDATE
        `, [tenant_id]);

        const tenant = tenantResult.rows[0];

        if (tenant && verification_status === "verified") {
            await promoteTenantToActiveIfEligible(
                client,
                tenant_id,
                verified_by,
                payment
            );
        } else if (tenant) {
            await logTenantActivity(
                client,
                tenant_id,
                tenant.institution_id,
                "payment_verified",
                verified_by,
                {
                    payment_verification_status: payment.verification_status,
                },
                {
                    payment_verification_status: verification_status,
                    payment_id,
                }
            );
        }

        await client.query("COMMIT");

        return payment;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const transferTenantBed = async ({
    tenant_id,
    institution_id,
    floor_id,
    room_id,
    bed_id,
    transfer_reason,
    transferred_by,
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const tenantResult = await client.query(`
            SELECT *
            FROM tenants
            WHERE id = $1
              AND deleted_at IS NULL
            FOR UPDATE
        `, [tenant_id]);

        const tenant = tenantResult.rows[0];

        if (!tenant) {
            throw Object.assign(new Error("Tenant not found"), {
                code: "TENANT_NOT_FOUND",
            });
        }

        const nextBed = await lockAndValidateBed(client, {
            institution_id,
            floor_id,
            room_id,
            bed_id,
        });

        if (tenant.bed_id) {
            await client.query(`
                UPDATE beds
                SET status = 'vacant'
                WHERE id = $1
            `, [tenant.bed_id]);
        }

        await client.query(`
            UPDATE beds
            SET status = $2
            WHERE id = $1
        `, [
            bed_id,
            inferBedStatusFromTenantStatus(tenant.status),
        ]);

        await client.query(`
            UPDATE tenants
            SET
                floor_id = $2,
                room_id = $3,
                bed_id = $4,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [
            tenant_id,
            floor_id,
            room_id,
            bed_id,
        ]);

        await client.query(`
            INSERT INTO tenant_bed_history (
                tenant_id,
                institution_id,
                from_floor_id,
                from_room_id,
                from_bed_id,
                to_floor_id,
                to_room_id,
                to_bed_id,
                transfer_reason,
                transferred_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            tenant_id,
            institution_id,
            tenant.floor_id,
            tenant.room_id,
            tenant.bed_id,
            floor_id,
            room_id,
            bed_id,
            transfer_reason || "Room transfer",
            transferred_by || null,
        ]);

        await createMonthlyDue(client, {
            id: tenant_id,
            institution_id,
            check_in_date: tenant.check_in_date,
            billing_cycle_type: tenant.billing_cycle_type || "anniversary",
        }, nextBed.rent_override || nextBed.rent_amount);

        await logTenantActivity(
            client,
            tenant_id,
            institution_id,
            "tenant_room_transferred",
            transferred_by,
            {
                floor_id: tenant.floor_id,
                room_id: tenant.room_id,
                bed_id: tenant.bed_id,
            },
            {
                floor_id,
                room_id,
                bed_id,
            }
        );

        await syncOccupancyStats(client, institution_id);
        await client.query("COMMIT");

        return getTenantByIdWithPayments(tenant_id);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const vacateTenantStay = async ({
    tenant_id,
    institution_id,
    checkout_date,
    damage_charges,
    refundable_amount,
    deposit_refund_status,
    notes,
    performed_by,
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const tenantResult = await client.query(`
            SELECT *
            FROM tenants
            WHERE id = $1
              AND deleted_at IS NULL
            FOR UPDATE
        `, [tenant_id]);

        const tenant = tenantResult.rows[0];

        if (!tenant) {
            throw Object.assign(new Error("Tenant not found"), {
                code: "TENANT_NOT_FOUND",
            });
        }

        if (tenant.bed_id) {
            await client.query(`
                UPDATE beds
                SET status = 'vacant'
                WHERE id = $1
            `, [tenant.bed_id]);
        }

        const normalizedRefundableAmount = normalizeNumber(refundable_amount) ??
            Math.max(
                Number(tenant.deposit_paid || 0) - Number(damage_charges || 0),
                0
            );

        await client.query(`
            UPDATE tenants
            SET
                status = 'vacated',
                checkout_date = $2,
                refundable_amount = $3,
                deposit_refund_status = $4,
                notes = COALESCE($5, notes),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [
            tenant_id,
            checkout_date || new Date().toISOString().split("T")[0],
            normalizedRefundableAmount,
            deposit_refund_status || "pending",
            notes || null,
        ]);

        await logTenantActivity(
            client,
            tenant_id,
            institution_id,
            "tenant_vacated",
            performed_by,
            {
                status: tenant.status,
                bed_id: tenant.bed_id,
            },
            {
                status: "vacated",
                checkout_date,
                refundable_amount: normalizedRefundableAmount,
                damage_charges: normalizeNumber(damage_charges) || 0,
            }
        );

        await syncOccupancyStats(client, institution_id);
        await client.query("COMMIT");

        return getTenantByIdWithPayments(tenant_id);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const deleteTenantById = async (id, deletedBy = null) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const tenantResult = await client.query(`
            SELECT *
            FROM tenants
            WHERE id = $1
              AND deleted_at IS NULL
            FOR UPDATE
        `, [id]);

        const tenant = tenantResult.rows[0];

        if (!tenant) {
            await client.query("ROLLBACK");
            return null;
        }

        if (tenant.bed_id) {
            await client.query(`
                UPDATE beds
                SET status = 'vacant'
                WHERE id = $1
            `, [tenant.bed_id]);
        }

        await client.query(`
            UPDATE tenants
            SET
                deleted_at = CURRENT_TIMESTAMP,
                deleted_by = $2,
                status = 'blocked',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id, deletedBy]);

        await logTenantActivity(
            client,
            id,
            tenant.institution_id,
            "tenant_soft_deleted",
            deletedBy,
            {
                deleted_at: null,
                status: tenant.status,
            },
            {
                deleted: true,
                status: "blocked",
            }
        );

        await syncOccupancyStats(client, tenant.institution_id);
        await client.query("COMMIT");

        return {
            ...tenant,
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const getTenantDashboardStats = async (institutionId = null) => {
    await reconcileVerifiedTenantStatuses(pool, institutionId);
    await syncOccupancyStats(pool, institutionId);

    const values = [];
    const tenantScope = ["deleted_at IS NULL"];
    const bedScope = [];
    const paymentScope = [];

    if (institutionId) {
        values.push(institutionId);
        tenantScope.push(`institution_id = $${values.length}`);
        bedScope.push(`institution_id = $${values.length}`);
        paymentScope.push(`institution_id = $${values.length}`);
    }

    const [tenantSummary, bedSummary, paymentSummary] = await Promise.all([
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'active') AS active_tenants,
                COUNT(*) FILTER (WHERE status = 'vacated') AS vacated_tenants,
                COUNT(*) FILTER (WHERE status = 'pending_verification') AS pending_verification_tenants,
                COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_tenants
            FROM tenants
            WHERE ${tenantScope.join(" AND ")}
        `, values),
        pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'occupied') AS occupied_beds,
                COUNT(*) FILTER (WHERE status = 'vacant') AS vacant_beds,
                COUNT(*) FILTER (WHERE status = 'reserved') AS reserved_beds,
                COUNT(*) FILTER (WHERE status = 'maintenance') AS maintenance_beds
            FROM beds
            ${bedScope.length ? `WHERE ${bedScope.join(" AND ")}` : ""}
        `, institutionId ? [institutionId] : []),
        pool.query(`
            SELECT
                COALESCE(SUM(CASE WHEN payment_type = 'rent' THEN amount ELSE 0 END), 0) AS rent_revenue,
                COALESCE(SUM(CASE WHEN verification_status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payment_amount
            FROM tenant_payments
            ${paymentScope.length ? `WHERE ${paymentScope.join(" AND ")}` : ""}
        `, institutionId ? [institutionId] : []),
    ]);

    return {
        ...tenantSummary.rows[0],
        ...bedSummary.rows[0],
        ...paymentSummary.rows[0],
    };
};

module.exports = {
    createTenantOnboarding,
    createTenantPayment,
    deleteTenantById,
    findBedWithHierarchyById,
    findTenantById,
    getActiveTenants,
    getTenantActivityLogs,
    getTenantByIdWithPayments,
    getTenantDashboardStats,
    getTenantPayments,
    getVacantBeds,
    getVacatedTenants,
    transferTenantBed,
    updateTenantOnboarding,
    vacateTenantStay,
    verifyTenantPayment,
};
