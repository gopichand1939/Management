const db = require("../../Config/Database");
const pool = db;

const KitchenRequestModel = {
    getNextRequestNumber: async (institutionId, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_kitchen_request_sequences (
                    institution_id,
                    last_number,
                    updated_at
                )
                VALUES ($1, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (institution_id)
                DO UPDATE SET
                    last_number = ration_kitchen_request_sequences.last_number + 1,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING last_number;
            `;
            const result = await client.query(query, [institutionId]);
            const lastNumber = result.rows[0].last_number;
            return `KR${String(lastNumber).padStart(6, "0")}`;
        } catch (error) {
            throw error;
        }
    },

    createKitchenRequest: async (requestData, itemsData, createdBy, client) => {
        if (!client) {
            return await db.transaction(async (trxClient) => {
                return await KitchenRequestModel.createKitchenRequest(requestData, itemsData, createdBy, trxClient);
            });
        }
        const localClient = client;

        try {

            const requestNumber = await KitchenRequestModel.getNextRequestNumber(
                requestData.institution_id,
                localClient
            );

            const insertRequestQuery = `
                INSERT INTO ration_kitchen_requests (
                    institution_id,
                    pg_admin_id,
                    request_number,
                    request_date,
                    required_date,
                    meal_type_id,
                    priority,
                    requested_by,
                    status,
                    remarks,
                    created_by,
                    updated_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id;
            `;
            const requestValues = [
                requestData.institution_id,
                requestData.pg_admin_id || null,
                requestNumber,
                requestData.request_date,
                requestData.required_date,
                requestData.meal_type_id,
                requestData.priority || 'medium',
                createdBy,
                requestData.status || 'draft',
                requestData.remarks || null,
                createdBy,
                createdBy
            ];

            const reqResult = await localClient.query(insertRequestQuery, requestValues);
            const requestId = reqResult.rows[0].id;

            const insertItemQuery = `
                INSERT INTO ration_kitchen_request_items (
                    request_id,
                    institution_id,
                    item_id,
                    requested_quantity,
                    approved_quantity,
                    issued_quantity,
                    remarks
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7);
            `;

            for (const item of itemsData) {
                const itemValues = [
                    requestId,
                    requestData.institution_id,
                    item.item_id,
                    item.requested_quantity,
                    item.approved_quantity || 0,
                    item.issued_quantity || 0,
                    item.remarks || null
                ];
                await localClient.query(insertItemQuery, itemValues);
            }

            return { id: requestId, request_number: requestNumber };
        } catch (error) {
            throw error;
        }
    },

    updateKitchenRequest: async (requestId, requestData, itemsData, updatedBy, client) => {
        if (!client) {
            return await db.transaction(async (trxClient) => {
                return await KitchenRequestModel.updateKitchenRequest(requestId, requestData, itemsData, updatedBy, trxClient);
            });
        }
        const localClient = client;

        try {

            const checkQuery = `SELECT status FROM ration_kitchen_requests WHERE id = $1 AND institution_id = $2`;
            const checkResult = await localClient.query(checkQuery, [requestId, requestData.institution_id]);
            if (checkResult.rows.length === 0) {
                throw new Error("Kitchen request not found");
            }
            const currentStatus = checkResult.rows[0].status;
            if (currentStatus !== 'draft' && currentStatus !== 'pending') {
                throw new Error(`Cannot update a kitchen request in ${currentStatus} status`);
            }

            const updateRequestQuery = `
                UPDATE ration_kitchen_requests
                SET
                    request_date = $1,
                    required_date = $2,
                    meal_type_id = $3,
                    priority = $4,
                    status = $5,
                    remarks = $6,
                    updated_by = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $8 AND institution_id = $9;
            `;
            const requestValues = [
                requestData.request_date,
                requestData.required_date,
                requestData.meal_type_id,
                requestData.priority || 'medium',
                requestData.status || currentStatus,
                requestData.remarks || null,
                updatedBy,
                requestId,
                requestData.institution_id
            ];

            await localClient.query(updateRequestQuery, requestValues);

            await localClient.query(`DELETE FROM ration_kitchen_request_items WHERE request_id = $1`, [requestId]);

            const insertItemQuery = `
                INSERT INTO ration_kitchen_request_items (
                    request_id,
                    institution_id,
                    item_id,
                    requested_quantity,
                    approved_quantity,
                    issued_quantity,
                    remarks
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7);
            `;

            for (const item of itemsData) {
                const itemValues = [
                    requestId,
                    requestData.institution_id,
                    item.item_id,
                    item.requested_quantity,
                    item.approved_quantity || 0,
                    item.issued_quantity || 0,
                    item.remarks || null
                ];
                await localClient.query(insertItemQuery, itemValues);
            }

            return { id: requestId };
        } catch (error) {
            throw error;
        }
    },

    getKitchenRequestList: async (institutionId, limit, offset, search = "", status = "", filters = {}, client = pool) => {
        try {
            let query = `
                SELECT
                    rkr.id,
                    rkr.institution_id,
                    rkr.request_number,
                    rkr.request_date,
                    rkr.required_date,
                    rkr.meal_type_id,
                    mtm.meal_type_name,
                    mtm.meal_type_code,
                    rkr.priority,
                    rkr.status,
                    rkr.remarks,
                    rkr.requested_by,
                    uc.email as requested_by_email,
                    COALESCE(sa.name, pa.pg_admin_name, uc.email) as requested_by_name,
                    rkr.created_at,
                    (SELECT COUNT(*)::integer FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id) as total_items
                FROM ration_kitchen_requests rkr
                LEFT JOIN meal_type_master mtm ON rkr.meal_type_id = mtm.id
                LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
                LEFT JOIN super_admins sa ON uc.super_admin_id = sa.id
                LEFT JOIN pg_admin pa ON uc.pg_admin_id = pa.id
                WHERE rkr.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rkr.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (search) {
                query += ` AND (rkr.request_number ILIKE $${paramIndex} OR uc.email ILIKE $${paramIndex} OR sa.name ILIKE $${paramIndex} OR pa.pg_admin_name ILIKE $${paramIndex} OR rkr.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (filters.meal_type_id) {
                query += ` AND rkr.meal_type_id = $${paramIndex}`;
                values.push(Number(filters.meal_type_id));
                paramIndex++;
            }

            if (filters.priority) {
                query += ` AND rkr.priority = $${paramIndex}`;
                values.push(filters.priority);
                paramIndex++;
            }

            if (filters.start_date) {
                query += ` AND rkr.request_date >= $${paramIndex}`;
                values.push(filters.start_date);
                paramIndex++;
            }

            if (filters.end_date) {
                query += ` AND rkr.request_date <= $${paramIndex}`;
                values.push(filters.end_date);
                paramIndex++;
            }

            query += ` ORDER BY rkr.request_date DESC, rkr.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            values.push(limit, offset);

            const result = await client.query(query, values);
            return result.rows;
        } catch (error) {
            throw error;
        }
    },

    getKitchenRequestCount: async (institutionId, search = "", status = "", filters = {}, client = pool) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_kitchen_requests rkr
                LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
                LEFT JOIN super_admins sa ON uc.super_admin_id = sa.id
                LEFT JOIN pg_admin pa ON uc.pg_admin_id = pa.id
                WHERE rkr.institution_id = $1
            `;
            const values = [institutionId];
            let paramIndex = 2;

            if (status) {
                query += ` AND rkr.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (search) {
                query += ` AND (rkr.request_number ILIKE $${paramIndex} OR uc.email ILIKE $${paramIndex} OR sa.name ILIKE $${paramIndex} OR pa.pg_admin_name ILIKE $${paramIndex} OR rkr.remarks ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (filters.meal_type_id) {
                query += ` AND rkr.meal_type_id = $${paramIndex}`;
                values.push(Number(filters.meal_type_id));
                paramIndex++;
            }

            if (filters.priority) {
                query += ` AND rkr.priority = $${paramIndex}`;
                values.push(filters.priority);
                paramIndex++;
            }

            if (filters.start_date) {
                query += ` AND rkr.request_date >= $${paramIndex}`;
                values.push(filters.start_date);
                paramIndex++;
            }

            if (filters.end_date) {
                query += ` AND rkr.request_date <= $${paramIndex}`;
                values.push(filters.end_date);
                paramIndex++;
            }

            const result = await client.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getKitchenRequestById: async (id, institutionId, client = pool) => {
        try {
            const headerQuery = `
                SELECT
                    rkr.id,
                    rkr.institution_id,
                    rkr.request_number,
                    rkr.request_date,
                    rkr.required_date,
                    rkr.meal_type_id,
                    mtm.meal_type_name,
                    mtm.meal_type_code,
                    rkr.priority,
                    rkr.status,
                    rkr.remarks,
                    rkr.requested_by,
                    uc_req.email as requested_by_email,
                    COALESCE(sa_req.name, pa_req.pg_admin_name, uc_req.email) as requested_by_name,
                    rkr.approved_by,
                    uc_app.email as approved_by_email,
                    COALESCE(sa_app.name, pa_app.pg_admin_name, uc_app.email) as approved_by_name,
                    rkr.approval_date,
                    rkr.created_at,
                    rkr.updated_at
                FROM ration_kitchen_requests rkr
                LEFT JOIN meal_type_master mtm ON rkr.meal_type_id = mtm.id
                LEFT JOIN user_credentials uc_req ON rkr.requested_by = uc_req.id
                LEFT JOIN super_admins sa_req ON uc_req.super_admin_id = sa_req.id
                LEFT JOIN pg_admin pa_req ON uc_req.pg_admin_id = pa_req.id
                LEFT JOIN user_credentials uc_app ON rkr.approved_by = uc_app.id
                LEFT JOIN super_admins sa_app ON uc_app.super_admin_id = sa_app.id
                LEFT JOIN pg_admin pa_app ON uc_app.pg_admin_id = pa_app.id
                WHERE rkr.id = $1 AND rkr.institution_id = $2
            `;
            const headerResult = await client.query(headerQuery, [id, institutionId]);
            if (headerResult.rows.length === 0) {
                return null;
            }

            const requestRow = headerResult.rows[0];

            const itemsQuery = `
                SELECT
                    rkri.id as request_item_id,
                    rkri.item_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    ri.image_url,
                    rc.category_name,
                    rc.category_code,
                    ru.unit_name,
                    ru.unit_code,
                    rkri.requested_quantity,
                    rkri.approved_quantity,
                    rkri.issued_quantity,
                    rkri.remarks,
                    (
                        SELECT COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0)
                        FROM ration_stock_transactions rst
                        WHERE rst.item_id = rkri.item_id AND rst.institution_id = rkri.institution_id
                    ) as current_stock,
                    ri.minimum_stock,
                    ri.maximum_stock,
                    ri.reorder_quantity,
                    ri.default_purchase_price
                FROM ration_kitchen_request_items rkri
                INNER JOIN ration_items ri ON rkri.item_id = ri.id
                LEFT JOIN ration_item_categories rc ON ri.category_id = rc.id
                LEFT JOIN ration_units ru ON ri.unit_id = ru.id
                WHERE rkri.request_id = $1 AND rkri.institution_id = $2
                ORDER BY rkri.id ASC
            `;
            const itemsResult = await client.query(itemsQuery, [id, institutionId]);

            return {
                header: requestRow,
                items: itemsResult.rows.map(row => ({
                    ...row,
                    requested_quantity: parseFloat(row.requested_quantity || 0),
                    approved_quantity: parseFloat(row.approved_quantity || 0),
                    issued_quantity: parseFloat(row.issued_quantity || 0),
                    current_stock: parseFloat(row.current_stock || 0),
                    minimum_stock: parseFloat(row.minimum_stock || 0),
                    maximum_stock: parseFloat(row.maximum_stock || 0),
                    reorder_quantity: parseFloat(row.reorder_quantity || 0),
                    default_purchase_price: parseFloat(row.default_purchase_price || 0)
                }))
            };
        } catch (error) {
            throw error;
        }
    },

    deleteKitchenRequest: async (id, institutionId, client = pool) => {
        try {
            const checkQuery = `SELECT status FROM ration_kitchen_requests WHERE id = $1 AND institution_id = $2`;
            const checkResult = await client.query(checkQuery, [id, institutionId]);
            if (checkResult.rows.length === 0) {
                return false;
            }
            const status = checkResult.rows[0].status;
            if (status !== 'draft' && status !== 'pending') {
                throw new Error(`Cannot delete request in ${status} status`);
            }

            const deleteQuery = `DELETE FROM ration_kitchen_requests WHERE id = $1 AND institution_id = $2`;
            await client.query(deleteQuery, [id, institutionId]);
            return true;
        } catch (error) {
            throw error;
        }
    },

    approveKitchenRequest: async (id, institutionId, approvedItems, approvedBy, client) => {
        if (!client) {
            return await db.transaction(async (trxClient) => {
                return await KitchenRequestModel.approveKitchenRequest(id, institutionId, approvedItems, approvedBy, trxClient);
            });
        }
        const localClient = client;

        try {

            const checkQuery = `SELECT status FROM ration_kitchen_requests WHERE id = $1 AND institution_id = $2 FOR UPDATE`;
            const checkResult = await localClient.query(checkQuery, [id, institutionId]);
            if (checkResult.rows.length === 0) {
                throw new Error("Kitchen request not found");
            }
            const status = checkResult.rows[0].status;
            if (status !== 'pending') {
                throw new Error(`Cannot approve request in ${status} status`);
            }

            const updateHeaderQuery = `
                UPDATE ration_kitchen_requests
                SET
                    status = 'approved',
                    approved_by = $1,
                    approval_date = CURRENT_TIMESTAMP,
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND institution_id = $3;
            `;
            await localClient.query(updateHeaderQuery, [approvedBy, id, institutionId]);

            const updateItemQuery = `
                UPDATE ration_kitchen_request_items
                SET approved_quantity = $1
                WHERE request_id = $2 AND item_id = $3 AND institution_id = $4;
            `;

            for (const item of approvedItems) {
                await localClient.query(updateItemQuery, [
                    item.approved_quantity,
                    id,
                    item.item_id,
                    institutionId
                ]);
            }

            return true;
        } catch (error) {
            throw error;
        }
    },

    rejectKitchenRequest: async (id, institutionId, remarks, rejectedBy, client = pool) => {
        try {
            const checkQuery = `SELECT status FROM ration_kitchen_requests WHERE id = $1 AND institution_id = $2`;
            const checkResult = await client.query(checkQuery, [id, institutionId]);
            if (checkResult.rows.length === 0) {
                throw new Error("Kitchen request not found");
            }
            const status = checkResult.rows[0].status;
            if (status !== 'pending') {
                throw new Error(`Cannot reject request in ${status} status`);
            }

            const query = `
                UPDATE ration_kitchen_requests
                SET
                    status = 'rejected',
                    remarks = COALESCE($1, remarks),
                    approved_by = $2,
                    approval_date = CURRENT_TIMESTAMP,
                    updated_by = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND institution_id = $4;
            `;
            await client.query(query, [remarks, rejectedBy, id, institutionId]);
            return true;
        } catch (error) {
            throw error;
        }
    },

    getKitchenRequestSummary: async (institutionId, client = pool) => {
        try {
            const query = `
                SELECT
                    COUNT(CASE WHEN status = 'draft' THEN 1 END)::integer as draft_count,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END)::integer as pending_count,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END)::integer as approved_count,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END)::integer as rejected_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer as completed_count,
                    COUNT(*)::integer as total_count
                FROM ration_kitchen_requests
                WHERE institution_id = $1;
            `;
            const result = await client.query(query, [institutionId]);
            return result.rows[0] || {
                draft_count: 0,
                pending_count: 0,
                approved_count: 0,
                rejected_count: 0,
                completed_count: 0,
                total_count: 0
            };
        } catch (error) {
            throw error;
        }
    },

    getInstitutionIdByRequestId: async (id) => {
        const queryText = "SELECT institution_id FROM ration_kitchen_requests WHERE id = $1";
        const result = await db.query(queryText, [id]);
        return result.rows[0]?.institution_id || null;
    }
};

module.exports = KitchenRequestModel;
