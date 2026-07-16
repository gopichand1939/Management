const db = require("../../Config/Database");

const RationStockIssueModel = {
    getNextStockIssueNumber: async (institutionId, client) => {
        const executor = client || db;
        const query = `
            INSERT INTO ration_stock_issue_sequences (
                institution_id,
                last_number,
                updated_at
            )
            VALUES ($1, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (institution_id)
            DO UPDATE SET
                last_number = ration_stock_issue_sequences.last_number + 1,
                updated_at = CURRENT_TIMESTAMP
            RETURNING last_number;
        `;
        const result = await executor.query(query, [institutionId]);
        const lastNumber = result.rows[0].last_number;
        return `SI${String(lastNumber).padStart(6, "0")}`;
    },

    getApprovedRequestList: async (institutionId, limit, offset, search = "", client) => {
        const executor = client || db;
        let query = `
            SELECT
                rkr.id,
                rkr.request_number,
                rkr.request_date,
                rkr.required_date,
                mtm.meal_type_name,
                rkr.priority,
                uc.email as requested_by_email,
                COALESCE(sa.name, pa.pg_admin_name, uc.email) as requested_by_name,
                rkr.status,
                rkr.created_at,
                (SELECT COUNT(*)::integer FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id) as total_items,
                (SELECT COUNT(*)::integer FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id AND rkri.approved_quantity > rkri.issued_quantity) as remaining_items,
                (SELECT COALESCE(SUM(rkri.approved_quantity), 0)::numeric FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id) as total_approved_quantity,
                (SELECT COALESCE(SUM(rkri.issued_quantity), 0)::numeric FROM ration_kitchen_request_items rkri WHERE rkri.request_id = rkr.id) as total_issued_quantity
            FROM ration_kitchen_requests rkr
            LEFT JOIN meal_type_master mtm ON rkr.meal_type_id = mtm.id
            LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
            LEFT JOIN super_admins sa ON uc.super_admin_id = sa.id
            LEFT JOIN pg_admin pa ON uc.pg_admin_id = pa.id
            WHERE rkr.institution_id = $1
              AND rkr.status IN ('approved', 'partially_issued')
              AND EXISTS (
                  SELECT 1 FROM ration_kitchen_request_items rkri
                  WHERE rkri.request_id = rkr.id
                    AND rkri.approved_quantity > rkri.issued_quantity
              )
        `;
        const values = [institutionId];
        let paramIndex = 2;

        if (search) {
            query += ` AND (rkr.request_number ILIKE $${paramIndex} OR uc.email ILIKE $${paramIndex} OR sa.name ILIKE $${paramIndex} OR pa.pg_admin_name ILIKE $${paramIndex} OR rkr.remarks ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY rkr.required_date ASC, rkr.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const result = await executor.query(query, values);
        return result.rows;
    },

    getApprovedRequestCount: async (institutionId, search = "", client) => {
        const executor = client || db;
        let query = `
            SELECT COUNT(*)::integer as count
            FROM ration_kitchen_requests rkr
            LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
            LEFT JOIN super_admins sa ON uc.super_admin_id = sa.id
            LEFT JOIN pg_admin pa ON uc.pg_admin_id = pa.id
            WHERE rkr.institution_id = $1
              AND rkr.status IN ('approved', 'partially_issued')
              AND EXISTS (
                  SELECT 1 FROM ration_kitchen_request_items rkri
                  WHERE rkri.request_id = rkr.id
                    AND rkri.approved_quantity > rkri.issued_quantity
              )
        `;
        const values = [institutionId];
        let paramIndex = 2;

        if (search) {
            query += ` AND (rkr.request_number ILIKE $${paramIndex} OR uc.email ILIKE $${paramIndex} OR sa.name ILIKE $${paramIndex} OR pa.pg_admin_name ILIKE $${paramIndex} OR rkr.remarks ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        const result = await executor.query(query, values);
        return result.rows[0].count;
    },

    getApprovedRequestById: async (id, institutionId, client) => {
        const executor = client || db;
        const query = `
            SELECT
                rkr.id,
                rkr.request_number,
                rkr.request_date,
                rkr.required_date,
                mtm.meal_type_name,
                rkr.priority,
                uc.email as requested_by_email,
                COALESCE(sa.name, pa.pg_admin_name, uc.email) as requested_by_name,
                rkr.status,
                rkr.remarks
            FROM ration_kitchen_requests rkr
            LEFT JOIN meal_type_master mtm ON rkr.meal_type_id = mtm.id
            LEFT JOIN user_credentials uc ON rkr.requested_by = uc.id
            LEFT JOIN super_admins sa ON uc.super_admin_id = sa.id
            LEFT JOIN pg_admin pa ON uc.pg_admin_id = pa.id
            WHERE rkr.id = $1 AND rkr.institution_id = $2
        `;
        const result = await executor.query(query, [id, institutionId]);
        return result.rows[0] || null;
    },

    getApprovedRequestItems: async (requestId, institutionId, client) => {
        const executor = client || db;
        const query = `
            SELECT
                rkri.id as kitchen_request_item_id,
                rkri.item_id,
                ri.item_name,
                ri.item_code,
                ri.sku_id,
                ri.barcode,
                rc.category_name as category,
                ru.unit_code as unit,
                rkri.requested_quantity,
                rkri.approved_quantity,
                rkri.issued_quantity,
                (rkri.approved_quantity - rkri.issued_quantity) as remaining_quantity,
                (
                    SELECT COALESCE(SUM(rst.quantity_in) - SUM(rst.quantity_out), 0)::numeric
                    FROM ration_stock_transactions rst
                    WHERE rst.item_id = rkri.item_id AND rst.institution_id = rkri.institution_id
                ) as current_stock,
                ri.batch_tracking,
                ri.expiry_tracking,
                ri.default_purchase_price
            FROM ration_kitchen_request_items rkri
            INNER JOIN ration_items ri ON rkri.item_id = ri.id
            LEFT JOIN ration_item_categories rc ON ri.category_id = rc.id
            LEFT JOIN ration_units ru ON ri.unit_id = ru.id
            WHERE rkri.request_id = $1 AND rkri.institution_id = $2
            ORDER BY rkri.id ASC
        `;
        const result = await executor.query(query, [requestId, institutionId]);
        return result.rows;
    },

    getCurrentStockForItem: async (itemId, institutionId, client) => {
        const executor = client || db;
        const query = `
            SELECT COALESCE(SUM(quantity_in) - SUM(quantity_out), 0)::numeric as current_stock
            FROM ration_stock_transactions
            WHERE item_id = $1 AND institution_id = $2
        `;
        const result = await executor.query(query, [itemId, institutionId]);
        return parseFloat(result.rows[0].current_stock || 0);
    },

    createStockIssue: async (issueData, client) => {
        const executor = client || db;
        const query = `
            INSERT INTO ration_stock_issues (
                institution_id,
                pg_admin_id,
                issue_number,
                kitchen_request_id,
                issue_date,
                issued_to,
                meal_type_id,
                remarks,
                status,
                created_by,
                updated_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, issue_number;
        `;
        const values = [
            issueData.institution_id,
            issueData.pg_admin_id || null,
            issueData.issue_number,
            issueData.kitchen_request_id,
            issueData.issue_date,
            issueData.issued_to || null,
            issueData.meal_type_id || null,
            issueData.remarks || null,
            issueData.status || 'completed',
            issueData.created_by,
            issueData.created_by
        ];
        const result = await executor.query(query, values);
        return result.rows[0];
    },

    createStockIssueItem: async (itemData, client) => {
        const executor = client || db;
        const query = `
            INSERT INTO ration_stock_issue_items (
                stock_issue_id,
                institution_id,
                kitchen_request_item_id,
                item_id,
                approved_quantity,
                previously_issued_quantity,
                issue_quantity,
                unit_price,
                batch_number,
                expiry_date,
                remarks
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id;
        `;
        const values = [
            itemData.stock_issue_id,
            itemData.institution_id,
            itemData.kitchen_request_item_id,
            itemData.item_id,
            itemData.approved_quantity,
            itemData.previously_issued_quantity,
            itemData.issue_quantity,
            itemData.unit_price || 0,
            itemData.batch_number || null,
            itemData.expiry_date || null,
            itemData.remarks || null
        ];
        const result = await executor.query(query, values);
        return result.rows[0];
    },

    createStockTransaction: async (txData, client) => {
        const executor = client || db;
        const query = `
            INSERT INTO ration_stock_transactions (
                institution_id,
                item_id,
                transaction_type,
                reference_id,
                reference_number,
                quantity_in,
                quantity_out,
                batch_number,
                expiry_date,
                unit_price,
                remarks,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `;
        const values = [
            txData.institution_id,
            txData.item_id,
            txData.transaction_type,
            txData.reference_id,
            txData.reference_number,
            txData.quantity_in || 0,
            txData.quantity_out || 0,
            txData.batch_number || null,
            txData.expiry_date || null,
            txData.unit_price || 0,
            txData.remarks || null,
            txData.created_by
        ];
        const result = await executor.query(query, values);
        return result.rows[0];
    },

    updateKitchenRequestItemIssuedQuantity: async (kitchenRequestItemId, incrementQty, client) => {
        const executor = client || db;
        const query = `
            UPDATE ration_kitchen_request_items
            SET
                issued_quantity = issued_quantity + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
        `;
        await executor.query(query, [incrementQty, kitchenRequestItemId]);
    },

    updateKitchenRequestStatus: async (requestId, status, client) => {
        const executor = client || db;
        const query = `
            UPDATE ration_kitchen_requests
            SET
                status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
        `;
        await executor.query(query, [status, requestId]);
    },

    getStockIssueList: async (institutionId, limit, offset, search = "", status = "", client) => {
        const executor = client || db;
        let query = `
            SELECT
                rsi.id,
                rsi.issue_number,
                rsi.issue_date,
                rsi.remarks,
                rsi.status,
                rkr.request_number,
                mtm.meal_type_name,
                uc.email as created_by_email,
                rsi.created_at,
                (SELECT COUNT(*)::integer FROM ration_stock_issue_items rsii WHERE rsii.stock_issue_id = rsi.id) as total_items,
                (SELECT COALESCE(SUM(rsii.issue_quantity), 0)::numeric FROM ration_stock_issue_items rsii WHERE rsii.stock_issue_id = rsi.id) as total_quantity
            FROM ration_stock_issues rsi
            INNER JOIN ration_kitchen_requests rkr ON rsi.kitchen_request_id = rkr.id
            LEFT JOIN meal_type_master mtm ON rsi.meal_type_id = mtm.id
            LEFT JOIN user_credentials uc ON rsi.created_by = uc.id
            WHERE rsi.institution_id = $1
        `;
        const values = [institutionId];
        let paramIndex = 2;

        if (status) {
            query += ` AND rsi.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (rsi.issue_number ILIKE $${paramIndex} OR rkr.request_number ILIKE $${paramIndex} OR rsi.remarks ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY rsi.issue_date DESC, rsi.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const result = await executor.query(query, values);
        return result.rows;
    },

    getStockIssueCount: async (institutionId, search = "", status = "", client) => {
        const executor = client || db;
        let query = `
            SELECT COUNT(*)::integer as count
            FROM ration_stock_issues rsi
            INNER JOIN ration_kitchen_requests rkr ON rsi.kitchen_request_id = rkr.id
            LEFT JOIN user_credentials uc ON rsi.created_by = uc.id
            WHERE rsi.institution_id = $1
        `;
        const values = [institutionId];
        let paramIndex = 2;

        if (status) {
            query += ` AND rsi.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (rsi.issue_number ILIKE $${paramIndex} OR rkr.request_number ILIKE $${paramIndex} OR rsi.remarks ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        const result = await executor.query(query, values);
        return result.rows[0].count;
    },

    getStockIssueById: async (id, institutionId, client) => {
        const executor = client || db;
        const query = `
            SELECT
                rsi.id,
                rsi.issue_number,
                rsi.issue_date,
                rsi.remarks,
                rsi.status,
                rsi.kitchen_request_id,
                rkr.request_number,
                mtm.meal_type_name,
                uc_iss.email as issued_by_email,
                rsi.created_at,
                rsi.updated_at
            FROM ration_stock_issues rsi
            INNER JOIN ration_kitchen_requests rkr ON rsi.kitchen_request_id = rkr.id
            LEFT JOIN meal_type_master mtm ON rsi.meal_type_id = mtm.id
            LEFT JOIN user_credentials uc_iss ON rsi.created_by = uc_iss.id
            WHERE rsi.id = $1 AND rsi.institution_id = $2
        `;
        const result = await executor.query(query, [id, institutionId]);
        return result.rows[0] || null;
    },

    getStockIssueItems: async (stockIssueId, institutionId, client) => {
        const executor = client || db;
        const query = `
            SELECT
                rsii.id,
                rsii.item_id,
                ri.item_name,
                ri.sku_id,
                ri.barcode,
                ru.unit_code as unit,
                rsii.approved_quantity,
                rsii.previously_issued_quantity,
                rsii.issue_quantity,
                rsii.unit_price,
                rsii.batch_number,
                rsii.expiry_date,
                rsii.remarks
            FROM ration_stock_issue_items rsii
            INNER JOIN ration_items ri ON rsii.item_id = ri.id
            LEFT JOIN ration_units ru ON ri.unit_id = ru.id
            WHERE rsii.stock_issue_id = $1 AND rsii.institution_id = $2
            ORDER BY rsii.id ASC;
        `;
        const result = await executor.query(query, [stockIssueId, institutionId]);
        return result.rows;
    },

    cancelStockIssue: async (id, institutionId, client) => {
        const executor = client || db;
        const query = `
            UPDATE ration_stock_issues
            SET
                status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND institution_id = $2
            RETURNING *;
        `;
        const result = await executor.query(query, [id, institutionId]);
        return result.rows[0] || null;
    },

    // Transaction Wrappers
    createRationStockIssueTransaction: async (institutionId, pgAdminId, createdBy, issueData, items) => {
        return await db.transaction(async (client) => {
            const { kitchen_request_id, issue_date, remarks } = issueData;

            // Lock and read Kitchen Request Header
            const requestHeaderQuery = `
                SELECT id, request_number, meal_type_id, status 
                FROM ration_kitchen_requests 
                WHERE id = $1 AND institution_id = $2 
                FOR UPDATE
            `;
            const reqHeaderRes = await client.query(requestHeaderQuery, [Number(kitchen_request_id), institutionId]);
            if (reqHeaderRes.rows.length === 0) {
                throw new Error("Kitchen request not found or unauthorized");
            }
            const requestHeader = reqHeaderRes.rows[0];

            if (requestHeader.status !== 'approved' && requestHeader.status !== 'partially_issued') {
                throw new Error(`Cannot issue stock for request in status '${requestHeader.status}'`);
            }

            // Lock and read Kitchen Request item rows
            const requestItemsQuery = `
                SELECT id, item_id, approved_quantity, issued_quantity 
                FROM ration_kitchen_request_items 
                WHERE request_id = $1 AND institution_id = $2 
                FOR UPDATE
            `;
            const reqItemsRes = await client.query(requestItemsQuery, [Number(kitchen_request_id), institutionId]);
            const dbRequestItems = reqItemsRes.rows;

            if (dbRequestItems.length === 0) {
                throw new Error("Approved request has no items to issue");
            }

            const issueNumber = await RationStockIssueModel.getNextStockIssueNumber(institutionId, client);

            const issueResult = await RationStockIssueModel.createStockIssue({
                institution_id: institutionId,
                pg_admin_id: pgAdminId,
                issue_number: issueNumber,
                kitchen_request_id: Number(kitchen_request_id),
                issue_date,
                issued_to: createdBy,
                meal_type_id: requestHeader.meal_type_id,
                remarks,
                status: 'completed',
                created_by: createdBy
            }, client);

            const stockIssueId = issueResult.id;
            const issuedItems = [];

            for (const reqItem of items) {
                const dbItem = dbRequestItems.find(
                    i => i.id === Number(reqItem.kitchen_request_item_id) && i.item_id === Number(reqItem.item_id)
                );
                if (!dbItem) {
                    throw new Error(`Request item ID ${reqItem.kitchen_request_item_id} not found in this request`);
                }

                const approvedQty = parseFloat(dbItem.approved_quantity || 0);
                const previouslyIssuedQty = parseFloat(dbItem.issued_quantity || 0);
                const remainingQty = approvedQty - previouslyIssuedQty;
                const issueQty = parseFloat(reqItem.issue_quantity || 0);

                if (isNaN(issueQty) || issueQty <= 0) {
                    throw new Error("Issue quantity must be greater than 0");
                }
                if (issueQty > remainingQty) {
                    throw new Error(`Issue quantity (${issueQty}) exceeds remaining approved quantity (${remainingQty})`);
                }

                const currentStock = await RationStockIssueModel.getCurrentStockForItem(Number(reqItem.item_id), institutionId, client);
                if (issueQty > currentStock) {
                    throw new Error(`Issue quantity (${issueQty}) exceeds available stock (${currentStock})`);
                }

                const itemQuery = `SELECT batch_tracking, expiry_tracking, default_purchase_price FROM ration_items WHERE id = $1`;
                const itemRes = await client.query(itemQuery, [Number(reqItem.item_id)]);
                const itemDetails = itemRes.rows[0];

                if (itemDetails.batch_tracking && (!reqItem.batch_number || !reqItem.batch_number.trim())) {
                    throw new Error(`Batch number is required for item ID ${reqItem.item_id}`);
                }
                if (itemDetails.expiry_tracking && !reqItem.expiry_date) {
                    throw new Error(`Expiry date is required for item ID ${reqItem.item_id}`);
                }

                const issueItemResult = await RationStockIssueModel.createStockIssueItem({
                    stock_issue_id: stockIssueId,
                    institution_id: institutionId,
                    kitchen_request_item_id: Number(reqItem.kitchen_request_item_id),
                    item_id: Number(reqItem.item_id),
                    approved_quantity: approvedQty,
                    previously_issued_quantity: previouslyIssuedQty,
                    issue_quantity: issueQty,
                    unit_price: itemDetails.default_purchase_price || 0,
                    batch_number: reqItem.batch_number,
                    expiry_date: reqItem.expiry_date,
                    remarks: reqItem.remarks
                }, client);

                await RationStockIssueModel.createStockTransaction({
                    institution_id: institutionId,
                    item_id: Number(reqItem.item_id),
                    transaction_type: 'STOCK_ISSUE',
                    reference_id: stockIssueId,
                    reference_number: issueNumber,
                    quantity_in: 0,
                    quantity_out: issueQty,
                    batch_number: reqItem.batch_number,
                    expiry_date: reqItem.expiry_date,
                    unit_price: itemDetails.default_purchase_price || 0,
                    remarks: reqItem.remarks || remarks,
                    created_by: createdBy
                }, client);

                await RationStockIssueModel.updateKitchenRequestItemIssuedQuantity(
                    Number(reqItem.kitchen_request_item_id),
                    issueQty,
                    client
                );

                issuedItems.push({
                    id: issueItemResult.id,
                    item_id: reqItem.item_id,
                    issue_quantity: issueQty
                });
            }

            const updatedItemsRes = await client.query(
                `SELECT approved_quantity, issued_quantity FROM ration_kitchen_request_items WHERE request_id = $1`,
                [Number(kitchen_request_id)]
            );
            const updatedItems = updatedItemsRes.rows;

            let allCompleted = true;
            let anyIssued = false;

            for (const uItem of updatedItems) {
                const uApproved = parseFloat(uItem.approved_quantity || 0);
                const uIssued = parseFloat(uItem.issued_quantity || 0);

                if (uIssued < uApproved) {
                    allCompleted = false;
                }
                if (uIssued > 0) {
                    anyIssued = true;
                }
            }

            let newStatus = 'approved';
            if (allCompleted && updatedItems.length > 0) {
                newStatus = 'completed';
            } else if (anyIssued) {
                newStatus = 'partially_issued';
            }

            await RationStockIssueModel.updateKitchenRequestStatus(Number(kitchen_request_id), newStatus, client);

            return {
                issue: {
                    id: stockIssueId,
                    issue_number: issueNumber,
                    kitchen_request_id,
                    issue_date,
                    status: 'completed'
                },
                items: issuedItems
            };
        });
    },

    cancelRationStockIssueTransaction: async (id, institutionId, createdBy) => {
        return await db.transaction(async (client) => {
            const issueRes = await client.query(
                `SELECT id, issue_number, kitchen_request_id, status FROM ration_stock_issues WHERE id = $1 AND institution_id = $2 FOR UPDATE`,
                [Number(id), institutionId]
            );
            if (issueRes.rows.length === 0) {
                throw new Error("Stock issue record not found or unauthorized");
            }
            const issue = issueRes.rows[0];

            if (issue.status !== 'completed') {
                throw new Error(`Cannot cancel stock issue in status '${issue.status}'`);
            }

            const issueItemsRes = await client.query(
                `SELECT item_id, kitchen_request_item_id, issue_quantity, unit_price, batch_number, expiry_date FROM ration_stock_issue_items WHERE stock_issue_id = $1 AND institution_id = $2 FOR UPDATE`,
                [Number(id), institutionId]
            );
            const issueItems = issueItemsRes.rows;

            const requestHeaderQuery = `
                SELECT id, status FROM ration_kitchen_requests WHERE id = $1 AND institution_id = $2 FOR UPDATE
            `;
            await client.query(requestHeaderQuery, [issue.kitchen_request_id, institutionId]);

            await RationStockIssueModel.cancelStockIssue(Number(id), institutionId, client);

            for (const issueItem of issueItems) {
                await RationStockIssueModel.createStockTransaction({
                    institution_id: institutionId,
                    item_id: Number(issueItem.item_id),
                    transaction_type: 'STOCK_ISSUE_CANCEL',
                    reference_id: Number(id),
                    reference_number: issue.issue_number,
                    quantity_in: parseFloat(issueItem.issue_quantity),
                    quantity_out: 0,
                    batch_number: issueItem.batch_number,
                    expiry_date: issueItem.expiry_date,
                    unit_price: parseFloat(issueItem.unit_price),
                    remarks: `Cancelled issue ${issue.issue_number}`,
                    created_by: createdBy
                }, client);

                const decrQty = -parseFloat(issueItem.issue_quantity);
                await RationStockIssueModel.updateKitchenRequestItemIssuedQuantity(
                    Number(issueItem.kitchen_request_item_id),
                    decrQty,
                    client
                );
            }

            const updatedItemsRes = await client.query(
                `SELECT approved_quantity, issued_quantity FROM ration_kitchen_request_items WHERE request_id = $1`,
                [issue.kitchen_request_id]
            );
            const updatedItems = updatedItemsRes.rows;

            let allCompleted = true;
            let anyIssued = false;

            for (const uItem of updatedItems) {
                const uApproved = parseFloat(uItem.approved_quantity || 0);
                const uIssued = parseFloat(uItem.issued_quantity || 0);

                if (uIssued < uApproved) {
                    allCompleted = false;
                }
                if (uIssued > 0) {
                    anyIssued = true;
                }
            }

            let newStatus = 'approved';
            if (allCompleted && updatedItems.length > 0) {
                newStatus = 'completed';
            } else if (anyIssued) {
                newStatus = 'partially_issued';
            }

            await RationStockIssueModel.updateKitchenRequestStatus(issue.kitchen_request_id, newStatus, client);
        });
    }
};

module.exports = RationStockIssueModel;
