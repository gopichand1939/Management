const db = require("../../Config/Database");

const RationStockAdjustmentModel = {
    getNextAdjustmentNumber: async (institutionId, client) => {
        const executor = client || db;

        // Find the maximum numeric suffix from existing stock adjustment numbers in this institution
        const maxNumQuery = `
            SELECT COALESCE(MAX(NULLIF(regexp_replace(adjustment_number, '[^0-9]', '', 'g'), '')::BIGINT), 0) AS max_num
            FROM ration_stock_adjustments
            WHERE institution_id = $1 AND adjustment_number ~* '^SA\\d+$'
        `;
        const maxNumResult = await executor.query(maxNumQuery, [institutionId]);
        const maxNumVal = parseInt(maxNumResult.rows[0].max_num || 0, 10);

        const queryText = `
            INSERT INTO ration_stock_adjustment_sequences (
                institution_id,
                last_number,
                updated_at
            )
            VALUES ($1, GREATEST($2 + 1, 1), CURRENT_TIMESTAMP)
            ON CONFLICT (institution_id)
            DO UPDATE SET
                last_number = GREATEST(ration_stock_adjustment_sequences.last_number + 1, EXCLUDED.last_number),
                updated_at = CURRENT_TIMESTAMP
            RETURNING last_number;
        `;
        const result = await executor.query(queryText, [institutionId, maxNumVal]);
        const lastNumber = result.rows[0].last_number;
        return `SA${String(lastNumber).padStart(6, "0")}`;
    },

    createStockAdjustment: async (adjData, client) => {
        const executor = client || db;
        const queryText = `
            INSERT INTO ration_stock_adjustments (
                institution_id,
                adjustment_number,
                adjustment_date,
                reason,
                remarks,
                status,
                created_by,
                approved_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, adjustment_number;
        `;
        const values = [
            adjData.institution_id,
            adjData.adjustment_number,
            adjData.adjustment_date,
            adjData.reason,
            adjData.remarks || null,
            adjData.status || 'completed',
            adjData.created_by,
            adjData.approved_by || null
        ];
        const result = await executor.query(queryText, values);
        return result.rows[0];
    },

    createStockAdjustmentItem: async (itemData, client) => {
        const executor = client || db;
        const queryText = `
            INSERT INTO ration_stock_adjustment_items (
                stock_adjustment_id,
                institution_id,
                item_id,
                current_stock,
                adjustment_quantity,
                adjustment_direction,
                previous_stock,
                new_stock,
                reason,
                remarks
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id;
        `;
        const values = [
            itemData.stock_adjustment_id,
            itemData.institution_id,
            itemData.item_id,
            itemData.current_stock,
            itemData.adjustment_quantity,
            itemData.adjustment_direction,
            itemData.previous_stock,
            itemData.new_stock,
            itemData.reason || null,
            itemData.remarks || null
        ];
        const result = await executor.query(queryText, values);
        return result.rows[0];
    },

    createStockTransaction: async (txData, client) => {
        const executor = client || db;
        const queryText = `
            INSERT INTO ration_stock_transactions (
                institution_id,
                item_id,
                transaction_type,
                reference_type,
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id;
        `;
        const values = [
            txData.institution_id,
            txData.item_id,
            txData.transaction_type,
            txData.reference_type,
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
        const result = await executor.query(queryText, values);
        return result.rows[0];
    },

    getCurrentStockForItem: async (itemId, institutionId, client) => {
        const executor = client || db;
        const queryText = `
            SELECT COALESCE(SUM(quantity_in) - SUM(quantity_out), 0)::numeric as current_stock
            FROM ration_stock_transactions
            WHERE item_id = $1 AND institution_id = $2
        `;
        const result = await executor.query(queryText, [itemId, institutionId]);
        return parseFloat(result.rows[0].current_stock || 0);
    },

    getAdjustmentList: async (institutionId, limit, offset, search = "", status = "", reason = "", client) => {
        const executor = client || db;
        let queryText = `
            SELECT
                rsa.id,
                rsa.adjustment_number,
                rsa.adjustment_date,
                rsa.reason,
                rsa.remarks,
                rsa.status,
                uc.email as created_by_email,
                rsa.created_at,
                (SELECT COUNT(*)::integer FROM ration_stock_adjustment_items rsai WHERE rsai.stock_adjustment_id = rsa.id) as total_items,
                (SELECT COALESCE(SUM(rsai.adjustment_quantity), 0)::numeric FROM ration_stock_adjustment_items rsai WHERE rsai.stock_adjustment_id = rsa.id) as total_quantity
            FROM ration_stock_adjustments rsa
            LEFT JOIN user_credentials uc ON rsa.created_by = uc.id
            WHERE rsa.institution_id = $1
        `;
        const values = [institutionId];
        let paramIndex = 2;

        if (status) {
            queryText += ` AND rsa.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (reason) {
            queryText += ` AND rsa.reason = $${paramIndex}`;
            values.push(reason);
            paramIndex++;
        }

        if (search) {
            queryText += ` AND (rsa.adjustment_number ILIKE $${paramIndex} OR rsa.remarks ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        queryText += ` ORDER BY rsa.adjustment_date DESC, rsa.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        values.push(limit, offset);

        const result = await executor.query(queryText, values);
        return result.rows;
    },

    getAdjustmentCount: async (institutionId, search = "", status = "", reason = "", client) => {
        const executor = client || db;
        let queryText = `
            SELECT COUNT(*)::integer as count
            FROM ration_stock_adjustments rsa
            WHERE rsa.institution_id = $1
        `;
        const values = [institutionId];
        let paramIndex = 2;

        if (status) {
            queryText += ` AND rsa.status = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        if (reason) {
            queryText += ` AND rsa.reason = $${paramIndex}`;
            values.push(reason);
            paramIndex++;
        }

        if (search) {
            queryText += ` AND (rsa.adjustment_number ILIKE $${paramIndex} OR rsa.remarks ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }

        const result = await executor.query(queryText, values);
        return result.rows[0].count;
    },

    getAdjustmentById: async (id, institutionId, client) => {
        const executor = client || db;
        const queryText = `
            SELECT
                rsa.id,
                rsa.adjustment_number,
                rsa.adjustment_date,
                rsa.reason,
                rsa.remarks,
                rsa.status,
                uc_cre.email as created_by_email,
                uc_app.email as approved_by_email,
                rsa.created_at,
                rsa.updated_at
            FROM ration_stock_adjustments rsa
            LEFT JOIN user_credentials uc_cre ON rsa.created_by = uc_cre.id
            LEFT JOIN user_credentials uc_app ON rsa.approved_by = uc_app.id
            WHERE rsa.id = $1 AND rsa.institution_id = $2
        `;
        const result = await executor.query(queryText, [id, institutionId]);
        return result.rows[0] || null;
    },

    getAdjustmentItems: async (stockAdjustmentId, institutionId, client) => {
        const executor = client || db;
        const queryText = `
            SELECT
                rsai.id,
                rsai.item_id,
                ri.item_name,
                ri.item_code,
                ri.sku_id,
                ri.barcode,
                ru.unit_code as unit,
                rsai.current_stock,
                rsai.adjustment_quantity,
                rsai.adjustment_direction,
                rsai.previous_stock,
                rsai.new_stock,
                rsai.reason,
                rsai.remarks
            FROM ration_stock_adjustment_items rsai
            INNER JOIN ration_items ri ON rsai.item_id = ri.id
            LEFT JOIN ration_units ru ON ri.unit_id = ru.id
            WHERE rsai.stock_adjustment_id = $1 AND rsai.institution_id = $2
            ORDER BY rsai.id ASC;
        `;
        const result = await executor.query(queryText, [stockAdjustmentId, institutionId]);
        return result.rows;
    },

    cancelStockAdjustment: async (id, institutionId, client) => {
        const executor = client || db;
        const queryText = `
            UPDATE ration_stock_adjustments
            SET
                status = 'cancelled',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND institution_id = $2
            RETURNING *;
        `;
        const result = await executor.query(queryText, [id, institutionId]);
        return result.rows[0] || null;
    },

    // Transaction Wrappers
    createStockAdjustmentTransaction: async (institutionId, createdBy, adjData, items) => {
        return await db.transaction(async (client) => {
            const { adjustment_date, reason, remarks } = adjData;

            const adjNumber = await RationStockAdjustmentModel.getNextAdjustmentNumber(institutionId, client);

            const adjHeader = await RationStockAdjustmentModel.createStockAdjustment({
                institution_id: institutionId,
                adjustment_number: adjNumber,
                adjustment_date,
                reason,
                remarks,
                status: "completed",
                created_by: createdBy
            }, client);

            const stockAdjustmentId = adjHeader.id;

            for (const item of items) {
                const itemId = Number(item.item_id);
                const adjQty = parseFloat(item.adjustment_quantity);
                const direction = item.adjustment_direction;
                const itemRemarks = item.remarks || null;
                const itemReason = item.reason || reason;

                if (isNaN(adjQty) || adjQty <= 0) {
                    throw new Error("Adjustment quantity must be greater than zero");
                }
                if (direction !== "increase" && direction !== "decrease") {
                    throw new Error("Adjustment direction must be either 'increase' or 'decrease'");
                }

                const currentStock = await RationStockAdjustmentModel.getCurrentStockForItem(itemId, institutionId, client);

                if (direction === "decrease" && adjQty > currentStock) {
                    throw new Error(`Adjustment decrease quantity (${adjQty}) cannot exceed current available stock (${currentStock}) for item ID ${itemId}`);
                }

                const previousStock = currentStock;
                const newStock = direction === "increase" ? previousStock + adjQty : previousStock - adjQty;

                await RationStockAdjustmentModel.createStockAdjustmentItem({
                    stock_adjustment_id: stockAdjustmentId,
                    institution_id: institutionId,
                    item_id: itemId,
                    current_stock: currentStock,
                    adjustment_quantity: adjQty,
                    adjustment_direction: direction,
                    previous_stock: previousStock,
                    new_stock: newStock,
                    reason: itemReason,
                    remarks: itemRemarks
                }, client);

                await RationStockAdjustmentModel.createStockTransaction({
                    institution_id: institutionId,
                    item_id: itemId,
                    transaction_type: "ADJUSTMENT",
                    reference_type: "ADJUSTMENT",
                    reference_id: stockAdjustmentId,
                    reference_number: adjNumber,
                    quantity_in: direction === "increase" ? adjQty : 0,
                    quantity_out: direction === "decrease" ? adjQty : 0,
                    batch_number: null,
                    expiry_date: null,
                    unit_price: 0,
                    remarks: itemRemarks || remarks,
                    created_by: createdBy
                }, client);
            }

            return {
                id: stockAdjustmentId,
                adjustment_number: adjNumber
            };
        });
    },

    cancelStockAdjustmentTransaction: async (id, institutionId, createdBy) => {
        return await db.transaction(async (client) => {
            const selectQuery = `
                SELECT id, adjustment_number, status 
                FROM ration_stock_adjustments 
                WHERE id = $1 AND institution_id = $2 
                FOR UPDATE
            `;
            const selectRes = await client.query(selectQuery, [Number(id), institutionId]);
            if (selectRes.rows.length === 0) {
                throw new Error("Stock adjustment not found or unauthorized");
            }

            const adjustment = selectRes.rows[0];
            if (adjustment.status !== "completed") {
                throw new Error(`Only completed stock adjustments can be cancelled. Current status is '${adjustment.status}'.`);
            }

            const items = await RationStockAdjustmentModel.getAdjustmentItems(Number(id), institutionId, client);

            for (const item of items) {
                const itemId = Number(item.item_id);
                const adjQty = parseFloat(item.adjustment_quantity);
                const direction = item.adjustment_direction;

                const currentStock = await RationStockAdjustmentModel.getCurrentStockForItem(itemId, institutionId, client);

                if (direction === "increase" && adjQty > currentStock) {
                    throw new Error(`Cannot cancel stock adjustment. Reversal requires subtracting ${adjQty} units of ${item.item_name}, but current available stock is only ${currentStock}.`);
                }

                await RationStockAdjustmentModel.createStockTransaction({
                    institution_id: institutionId,
                    item_id: itemId,
                    transaction_type: "ADJUSTMENT",
                    reference_type: "ADJUSTMENT_CANCEL",
                    reference_id: Number(id),
                    reference_number: adjustment.adjustment_number,
                    quantity_in: direction === "decrease" ? adjQty : 0,
                    quantity_out: direction === "increase" ? adjQty : 0,
                    batch_number: null,
                    expiry_date: null,
                    unit_price: 0,
                    remarks: `Cancellation offset for Stock Adjustment ${adjustment.adjustment_number}`,
                    created_by: createdBy
                }, client);
            }

            await RationStockAdjustmentModel.cancelStockAdjustment(Number(id), institutionId, client);
        });
    }
};

module.exports = RationStockAdjustmentModel;
