const db = require("../../Config/Database");
const pool = db;

const RationPurchaseModel = {
    getNextPurchaseNumber: async (institutionId, client = pool) => {
        try {
            const query = `
                INSERT INTO ration_purchase_sequences (
                    institution_id,
                    last_number,
                    updated_at
                )
                VALUES ($1, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (institution_id)
                DO UPDATE SET
                    last_number = ration_purchase_sequences.last_number + 1,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING last_number;
            `;
            const result = await client.query(query, [institutionId]);
            const lastNumber = result.rows[0].last_number;
            return `PUR${String(lastNumber).padStart(6, "0")}`;
        } catch (error) {
            throw error;
        }
    },

    // Get current stock for an item
    getCurrentStock: async (itemId, institutionId, client = pool) => {
        const query = `
            SELECT COALESCE(SUM(quantity_in - quantity_out), 0)::numeric as current_stock
            FROM ration_stock_ledger
            WHERE item_id = $1 AND institution_id = $2
        `;
        const result = await client.query(query, [itemId, institutionId]);
        return parseFloat(result.rows[0].current_stock || 0);
    },

    // Check if inventory has been consumed or adjusted (for delete rules)
    isInventoryConsumed: async (itemId, batchId, institutionId, client = pool) => {
        // Check if there are issues, adjustments, returns, etc.
        // That is, any quantity_out in the ledger for this batch/item
        let query = `
            SELECT COALESCE(SUM(quantity_out), 0)::numeric as total_out
            FROM ration_stock_ledger
            WHERE item_id = $1 AND institution_id = $2
        `;
        const params = [itemId, institutionId];
        if (batchId) {
            query += ` AND batch_id = $3`;
            params.push(batchId);
        }
        const result = await client.query(query, params);
        return parseFloat(result.rows[0].total_out || 0) > 0;
    },

    // Create Audit Log entry
    createAuditLog: async (logData, client = pool) => {
        const query = `
            INSERT INTO ration_purchase_audit_logs (
                institution_id,
                purchase_id,
                action,
                performed_by,
                old_values,
                new_values,
                remarks
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const values = [
            logData.institution_id,
            logData.purchase_id,
            logData.action,
            logData.performed_by || null,
            logData.old_values ? JSON.stringify(logData.old_values) : null,
            logData.new_values ? JSON.stringify(logData.new_values) : null,
            logData.remarks || null
        ];
        await client.query(query, values);
    },

    createRationPurchase: async (purchaseData, itemsData, createdBy, client) => {
        if (!client) {
            return await db.transaction(async (trxClient) => {
                return await RationPurchaseModel.createRationPurchase(purchaseData, itemsData, createdBy, trxClient);
            });
        }
        const localClient = client;

        try {

            // Generate Purchase Number
            const purchaseNumber = await RationPurchaseModel.getNextPurchaseNumber(
                purchaseData.institution_id,
                localClient
            );

            // Calculate totals
            let subTotal = 0;
            let discountAmount = 0;
            let gstAmount = 0;

            const processedItems = [];

            for (const item of itemsData) {
                const qty = parseFloat(item.quantity) || 0;
                const freeQty = parseFloat(item.free_quantity) || 0;
                const price = parseFloat(item.unit_price) || 0;
                const discPct = parseFloat(item.discount_percentage) || 0;
                const gstPct = parseFloat(item.gst_percentage) || 0;

                const grossAmount = qty * price;
                const itemDiscVal = grossAmount * (discPct / 100);
                const taxableAmount = grossAmount - itemDiscVal;
                const itemGstVal = taxableAmount * (gstPct / 100);
                const lineTotal = taxableAmount + itemGstVal;

                subTotal += grossAmount;
                discountAmount += itemDiscVal;
                gstAmount += itemGstVal;

                processedItems.push({
                    ...item,
                    discount_amount: itemDiscVal,
                    gst_amount: itemGstVal,
                    line_total: lineTotal
                });
            }

            const otherCharges = parseFloat(purchaseData.other_charges) || 0;
            const tempGrandTotal = subTotal - discountAmount + gstAmount + otherCharges;
            const grandTotal = Math.round(tempGrandTotal);
            const roundOff = grandTotal - tempGrandTotal;

            const paidAmount = parseFloat(purchaseData.paid_amount) || 0;
            const balanceAmount = grandTotal - paidAmount;

            let paymentStatus = "unpaid";
            if (paidAmount >= grandTotal) {
                paymentStatus = "paid";
            } else if (paidAmount > 0) {
                paymentStatus = "partially_paid";
            }

            // Insert purchase header
            const headerQuery = `
                INSERT INTO ration_purchases (
                    institution_id,
                    pg_admin_id,
                    purchase_number,
                    purchase_date,
                    supplier_id,
                    supplier_invoice_number,
                    invoice_date,
                    notes,
                    sub_total,
                    discount_amount,
                    gst_amount,
                    other_charges,
                    round_off,
                    grand_total,
                    paid_amount,
                    balance_amount,
                    payment_status,
                    status,
                    version,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 1, $19)
                RETURNING *
            `;

            const headerValues = [
                purchaseData.institution_id,
                purchaseData.pg_admin_id || null,
                purchaseNumber,
                purchaseData.purchase_date,
                purchaseData.supplier_id,
                purchaseData.supplier_invoice_number || null,
                purchaseData.invoice_date || null,
                purchaseData.notes || null,
                subTotal,
                discountAmount,
                gstAmount,
                otherCharges,
                roundOff,
                grandTotal,
                paidAmount,
                balanceAmount,
                paymentStatus,
                purchaseData.status || "draft",
                createdBy
            ];

            const headerResult = await localClient.query(headerQuery, headerValues);
            const purchase = headerResult.rows[0];

            const insertedItems = [];
            const inventoryTransactionIds = [];

            // Insert items, manage batches, and stock ledger
            for (const item of processedItems) {
                let batchId = null;
                const totalQty = item.quantity + (item.free_quantity || 0);

                // Handle batch creation/update
                if (item.batch_number) {
                    const batchCheckQuery = `
                        SELECT id, remaining_quantity FROM ration_item_batches
                        WHERE institution_id = $1 AND item_id = $2 AND batch_number = $3
                    `;
                    const batchCheck = await localClient.query(batchCheckQuery, [
                        purchase.institution_id,
                        item.item_id,
                        item.batch_number.trim()
                    ]);

                    if (batchCheck.rows.length > 0) {
                        batchId = batchCheck.rows[0].id;
                        if (purchase.status === "completed") {
                            await localClient.query(`
                                UPDATE ration_item_batches
                                SET remaining_quantity = remaining_quantity + $1,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = $2
                            `, [totalQty, batchId]);
                        }
                    } else {
                        const batchInsertQuery = `
                            INSERT INTO ration_item_batches (
                                institution_id,
                                item_id,
                                batch_number,
                                manufacturing_date,
                                expiry_date,
                                initial_quantity,
                                remaining_quantity,
                                status
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
                            RETURNING id
                        `;
                        const initialQty = purchase.status === "completed" ? totalQty : 0;
                        const batchInsert = await localClient.query(batchInsertQuery, [
                            purchase.institution_id,
                            item.item_id,
                            item.batch_number.trim(),
                            item.manufacturing_date || null,
                            item.expiry_date || null,
                            initialQty,
                            initialQty
                        ]);
                        batchId = batchInsert.rows[0].id;
                    }
                }

                // Insert purchase item row
                const itemInsertQuery = `
                    INSERT INTO ration_purchase_items (
                        purchase_id,
                        item_id,
                        batch_id,
                        quantity,
                        free_quantity,
                        received_quantity,
                        unit_price,
                        discount_percentage,
                        discount_amount,
                        gst_percentage,
                        gst_amount,
                        line_total
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `;
                const itemInsertValues = [
                    purchase.id,
                    item.item_id,
                    batchId,
                    item.quantity,
                    item.free_quantity || 0,
                    purchase.status === "completed" ? totalQty : 0,
                    item.unit_price,
                    item.discount_percentage || 0,
                    item.discount_amount,
                    item.gst_percentage || 0,
                    item.gst_amount,
                    item.line_total
                ];
                const itemResult = await localClient.query(itemInsertQuery, itemInsertValues);
                insertedItems.push(itemResult.rows[0]);

                // Create stock ledger entry if completed
                if (purchase.status === "completed") {
                    const openingStock = await RationPurchaseModel.getCurrentStock(
                        item.item_id,
                        purchase.institution_id,
                        localClient
                    );
                    const closingStock = openingStock + totalQty;

                    const ledgerQuery = `
                        INSERT INTO ration_stock_ledger (
                            institution_id,
                            item_id,
                            batch_id,
                            reference_type,
                            reference_id,
                            reference_number,
                            opening_stock,
                            quantity_in,
                            quantity_out,
                            closing_stock,
                            created_by
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING id
                    `;
                    const ledgerValues = [
                        purchase.institution_id,
                        item.item_id,
                        batchId,
                        "PURCHASE",
                        purchase.id,
                        purchase.purchase_number,
                        openingStock,
                        totalQty,
                        0,
                        closingStock,
                        createdBy
                    ];
                    const ledgerResult = await localClient.query(ledgerQuery, ledgerValues);
                    inventoryTransactionIds.push(ledgerResult.rows[0].id);

                    const stockTxQuery = `
                        INSERT INTO ration_stock_transactions (
                            institution_id,
                            item_id,
                            transaction_type,
                            reference_type,
                            reference_id,
                            reference_number,
                            quantity_in,
                            quantity_out,
                            unit_price,
                            batch_number,
                            expiry_date,
                            created_by
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `;
                    await localClient.query(stockTxQuery, [
                        purchase.institution_id,
                        item.item_id,
                        "PURCHASE",
                        "PURCHASE",
                        purchase.id,
                        purchase.purchase_number,
                        totalQty,
                        0,
                        item.unit_price,
                        item.batch_number || null,
                        item.expiry_date || null,
                        createdBy
                    ]);
                }
            }

            // Create Audit Log
            await RationPurchaseModel.createAuditLog({
                institution_id: purchase.institution_id,
                purchase_id: purchase.id,
                action: "PURCHASE_CREATED",
                performed_by: createdBy,
                new_values: { purchase, items: insertedItems },
                remarks: `Purchase created successfully with status ${purchase.status}`
            }, localClient);

            if (isOwnClient) {
                await localClient.query("COMMIT");
            }

            // Format final response object
            const fullPurchase = await RationPurchaseModel.getRationPurchaseById(
                purchase.id,
                purchase.institution_id,
                localClient
            );

            // Add enterprise integration details
            if (purchase.status === "completed") {
                fullPurchase.inventory_integration = {
                    inventory_transaction_id: inventoryTransactionIds[0] || null,
                    stock_transaction_ids: inventoryTransactionIds,
                    inventory_updated: true,
                    stock_added: insertedItems.reduce((acc, it) => acc + parseFloat(it.quantity) + parseFloat(it.free_quantity), 0)
                };
            }

            return fullPurchase;
        } catch (error) {
            throw error;
        }
    },

    getRationPurchaseList: async (institutionId, limit, offset, search = "", status = "", filters = {}) => {
        try {
            let query = `
                SELECT
                    rp.id,
                    rp.institution_id,
                    rp.purchase_number,
                    rp.purchase_date,
                    rp.supplier_id,
                    rs.supplier_name,
                    rs.supplier_code,
                    rp.supplier_invoice_number,
                    rp.grand_total,
                    rp.paid_amount,
                    rp.balance_amount,
                    rp.payment_status,
                    rp.status,
                    rp.created_at,
                    rp.updated_at
                FROM ration_purchases rp
                INNER JOIN ration_suppliers rs ON rp.supplier_id = rs.id
                WHERE rp.institution_id = $1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += `
                    AND (
                        rp.purchase_number ILIKE $${paramIndex} OR
                        rs.supplier_name ILIKE $${paramIndex} OR
                        rp.supplier_invoice_number ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (status) {
                query += ` AND rp.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            // Advanced ERP Filtering
            if (filters.payment_status) {
                query += ` AND rp.payment_status = $${paramIndex}`;
                values.push(filters.payment_status);
                paramIndex++;
            }

            if (filters.start_date && filters.end_date) {
                query += ` AND rp.purchase_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                values.push(filters.start_date, filters.end_date);
                paramIndex += 2;
            }

            if (filters.min_amount !== undefined && filters.max_amount !== undefined) {
                query += ` AND rp.grand_total BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                values.push(filters.min_amount, filters.max_amount);
                paramIndex += 2;
            }

            if (filters.barcode || filters.item_name || filters.item_code || filters.category_id || filters.batch_number) {
                query += `
                    AND rp.id IN (
                        SELECT rpi.purchase_id
                        FROM ration_purchase_items rpi
                        INNER JOIN ration_items ri ON rpi.item_id = ri.id
                        LEFT JOIN ration_item_batches rib ON rpi.batch_id = rib.id
                        WHERE 1=1
                `;

                if (filters.barcode) {
                    query += ` AND ri.barcode = $${paramIndex}`;
                    values.push(filters.barcode);
                    paramIndex++;
                }

                if (filters.item_name) {
                    query += ` AND ri.item_name ILIKE $${paramIndex}`;
                    values.push(`%${filters.item_name}%`);
                    paramIndex++;
                }

                if (filters.item_code) {
                    query += ` AND ri.item_code = $${paramIndex}`;
                    values.push(filters.item_code);
                    paramIndex++;
                }

                if (filters.category_id) {
                    query += ` AND ri.category_id = $${paramIndex}`;
                    values.push(Number(filters.category_id));
                    paramIndex++;
                }

                if (filters.batch_number) {
                    query += ` AND rib.batch_number = $${paramIndex}`;
                    values.push(filters.batch_number);
                    paramIndex++;
                }

                query += ` )`;
            }

            query += ` ORDER BY rp.id DESC`;

            if (limit !== undefined && offset !== undefined) {
                query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
                values.push(limit, offset);
            }

            const result = await pool.query(query, values);

            // Return enriched objects for list API
            const enrichedList = [];
            for (const row of result.rows) {
                const enriched = await RationPurchaseModel.getRationPurchaseById(row.id, institutionId);
                enrichedList.push(enriched);
            }

            return enrichedList;
        } catch (error) {
            throw error;
        }
    },

    getRationPurchaseCount: async (institutionId, search = "", status = "", filters = {}) => {
        try {
            let query = `
                SELECT COUNT(*)::integer as count
                FROM ration_purchases rp
                INNER JOIN ration_suppliers rs ON rp.supplier_id = rs.id
                WHERE rp.institution_id = $1
            `;

            const values = [institutionId];
            let paramIndex = 2;

            if (search) {
                query += `
                    AND (
                        rp.purchase_number ILIKE $${paramIndex} OR
                        rs.supplier_name ILIKE $${paramIndex} OR
                        rp.supplier_invoice_number ILIKE $${paramIndex}
                    )
                `;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (status) {
                query += ` AND rp.status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            if (filters.payment_status) {
                query += ` AND rp.payment_status = $${paramIndex}`;
                values.push(filters.payment_status);
                paramIndex++;
            }

            if (filters.start_date && filters.end_date) {
                query += ` AND rp.purchase_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                values.push(filters.start_date, filters.end_date);
                paramIndex += 2;
            }

            if (filters.min_amount !== undefined && filters.max_amount !== undefined) {
                query += ` AND rp.grand_total BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
                values.push(filters.min_amount, filters.max_amount);
                paramIndex += 2;
            }

            if (filters.barcode || filters.item_name || filters.item_code || filters.category_id || filters.batch_number) {
                query += `
                    AND rp.id IN (
                        SELECT rpi.purchase_id
                        FROM ration_purchase_items rpi
                        INNER JOIN ration_items ri ON rpi.item_id = ri.id
                        LEFT JOIN ration_item_batches rib ON rpi.batch_id = rib.id
                        WHERE 1=1
                `;

                if (filters.barcode) {
                    query += ` AND ri.barcode = $${paramIndex}`;
                    values.push(filters.barcode);
                    paramIndex++;
                }

                if (filters.item_name) {
                    query += ` AND ri.item_name ILIKE $${paramIndex}`;
                    values.push(`%${filters.item_name}%`);
                    paramIndex++;
                }

                if (filters.item_code) {
                    query += ` AND ri.item_code = $${paramIndex}`;
                    values.push(filters.item_code);
                    paramIndex++;
                }

                if (filters.category_id) {
                    query += ` AND ri.category_id = $${paramIndex}`;
                    values.push(Number(filters.category_id));
                    paramIndex++;
                }

                if (filters.batch_number) {
                    query += ` AND rib.batch_number = $${paramIndex}`;
                    values.push(filters.batch_number);
                    paramIndex++;
                }

                query += ` )`;
            }

            const result = await pool.query(query, values);
            return result.rows[0].count;
        } catch (error) {
            throw error;
        }
    },

    getRationPurchaseById: async (id, institutionId, client = pool) => {
        try {
            const headerQuery = `
                SELECT
                    rp.id as purchase_id,
                    rp.purchase_number,
                    rp.purchase_date,
                    rp.supplier_invoice_number as invoice_number,
                    rp.invoice_date,
                    rp.notes,
                    rp.sub_total,
                    rp.discount_amount,
                    rp.gst_amount,
                    rp.other_charges,
                    rp.round_off,
                    rp.grand_total,
                    rp.paid_amount,
                    rp.balance_amount,
                    rp.payment_status,
                    rp.status,
                    rp.version,
                    rp.created_by,
                    rp.updated_by,
                    rp.created_at,
                    rp.updated_at,
                    rs.id as sup_id,
                    rs.supplier_name,
                    rs.supplier_code,
                    rs.phone as mobile,
                    rs.email,
                    rs.gst_number,
                    NULL as supplier_type,
                    rs.status as supplier_status
                FROM ration_purchases rp
                INNER JOIN ration_suppliers rs ON rp.supplier_id = rs.id
                WHERE rp.id = $1 AND rp.institution_id = $2
            `;

            const headerResult = await client.query(headerQuery, [id, institutionId]);
            if (headerResult.rows.length === 0) {
                return null;
            }

            const purchaseRow = headerResult.rows[0];

            // Construct Header details with correct ERP labels
            const purchase = {
                purchase_id: purchaseRow.purchase_id,
                purchase_number: purchaseRow.purchase_number,
                purchase_date: purchaseRow.purchase_date,
                supplier: {
                    id: purchaseRow.sup_id,
                    supplier_name: purchaseRow.supplier_name,
                    supplier_code: purchaseRow.supplier_code,
                    mobile: purchaseRow.mobile,
                    email: purchaseRow.email,
                    gst_number: purchaseRow.gst_number,
                    supplier_type: purchaseRow.supplier_type,
                    status: purchaseRow.supplier_status
                },
                invoice_number: purchaseRow.invoice_number,
                invoice_date: purchaseRow.invoice_date,
                notes: purchaseRow.notes,
                sub_total: parseFloat(purchaseRow.sub_total),
                discount_amount: parseFloat(purchaseRow.discount_amount),
                gst_amount: parseFloat(purchaseRow.gst_amount),
                other_charges: parseFloat(purchaseRow.other_charges),
                round_off: parseFloat(purchaseRow.round_off),
                grand_total: parseFloat(purchaseRow.grand_total),
                paid_amount: parseFloat(purchaseRow.paid_amount),
                balance_amount: parseFloat(purchaseRow.balance_amount),
                payment_status: purchaseRow.payment_status,
                payment_status_label: purchaseRow.payment_status?.toUpperCase()?.replace("_", " "),
                status: purchaseRow.status,
                status_label: purchaseRow.status?.toUpperCase(),
                version: purchaseRow.version,
                created_by: purchaseRow.created_by,
                updated_by: purchaseRow.updated_by,
                created_at: purchaseRow.created_at,
                updated_at: purchaseRow.updated_at
            };

            const itemsQuery = `
                SELECT
                    rpi.id as purchase_item_id,
                    rpi.item_id,
                    ri.item_name,
                    ri.item_code,
                    ri.sku_id,
                    ri.barcode,
                    ri.image_url,
                    ri.status as item_status,
                    rc.id as category_id,
                    rc.category_name,
                    rc.category_code,
                    ru.id as unit_id,
                    ru.unit_name,
                    ru.unit_code,
                    ri.batch_tracking,
                    ri.expiry_tracking,
                    ri.minimum_stock,
                    ri.maximum_stock,
                    ri.reorder_quantity,
                    ri.default_purchase_price,
                    rpi.quantity,
                    rpi.free_quantity,
                    rpi.received_quantity,
                    rpi.unit_price,
                    rpi.discount_percentage,
                    rpi.discount_amount,
                    rpi.gst_percentage,
                    rpi.gst_amount,
                    rpi.line_total,
                    rib.id as batch_id,
                    rib.batch_number,
                    rib.manufacturing_date,
                    rib.expiry_date,
                    rpi.created_at,
                    rpi.updated_at
                FROM ration_purchase_items rpi
                INNER JOIN ration_items ri ON rpi.item_id = ri.id
                INNER JOIN ration_item_categories rc ON ri.category_id = rc.id
                INNER JOIN ration_units ru ON ri.unit_id = ru.id
                LEFT JOIN ration_item_batches rib ON rpi.batch_id = rib.id
                WHERE rpi.purchase_id = $1
                ORDER BY rpi.id ASC
            `;

            const itemsResult = await client.query(itemsQuery, [id]);

            // Construct enriched Item details
            purchase.items = [];
            for (const itemRow of itemsResult.rows) {
                const curStock = await RationPurchaseModel.getCurrentStock(
                    itemRow.item_id,
                    institutionId,
                    client
                );

                // Expiry management calculations
                let isExpired = false;
                let daysToExpiry = null;
                let expiryStatus = "N/A";

                if (itemRow.expiry_tracking && itemRow.expiry_date) {
                    const expDate = new Date(itemRow.expiry_date);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    expDate.setHours(0,0,0,0);

                    const diffTime = expDate.getTime() - today.getTime();
                    daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    isExpired = daysToExpiry < 0;

                    if (isExpired) {
                        expiryStatus = "Expired";
                    } else if (daysToExpiry <= 30) {
                        expiryStatus = "Expiring Soon";
                    } else {
                        expiryStatus = "Valid";
                    }
                }

                // Financial values calculations
                const qty = parseFloat(itemRow.quantity);
                const uPrice = parseFloat(itemRow.unit_price);
                const discPct = parseFloat(itemRow.discount_percentage);
                const gstPct = parseFloat(itemRow.gst_percentage);

                const grossAmount = qty * uPrice;
                const discAmt = grossAmount * (discPct / 100);
                const taxableAmount = grossAmount - discAmt;
                const gstAmt = taxableAmount * (gstPct / 100);
                const netAmount = taxableAmount + gstAmt;

                purchase.items.push({
                    item_id: itemRow.item_id,
                    item_name: itemRow.item_name,
                    item_code: itemRow.item_code,
                    sku_id: itemRow.sku_id,
                    barcode: itemRow.barcode,
                    image_url: itemRow.image_url,
                    category: {
                        category_id: itemRow.category_id,
                        category_name: itemRow.category_name,
                        category_code: itemRow.category_code
                    },
                    unit: {
                        unit_id: itemRow.unit_id,
                        unit_name: itemRow.unit_name,
                        unit_code: itemRow.unit_code
                    },
                    item_configuration: {
                        batch_tracking: itemRow.batch_tracking,
                        expiry_tracking: itemRow.expiry_tracking,
                        minimum_stock: parseFloat(itemRow.minimum_stock || 0),
                        maximum_stock: parseFloat(itemRow.maximum_stock || 0),
                        reorder_quantity: parseFloat(itemRow.reorder_quantity || 0),
                        default_purchase_price: parseFloat(itemRow.default_purchase_price || 0)
                    },
                    inventory: {
                        current_stock: curStock,
                        reserved_stock: 0.0,
                        available_stock: curStock
                    },
                    purchase_information: {
                        purchase_price: uPrice,
                        quantity: qty,
                        free_quantity: parseFloat(itemRow.free_quantity),
                        received_quantity: parseFloat(itemRow.received_quantity),
                        unit_price: uPrice,
                        discount_percentage: discPct,
                        discount_amount: discAmt,
                        gst_percentage: gstPct,
                        gst_amount: gstAmt,
                        line_total: netAmount,
                        gross_amount: grossAmount,
                        taxable_amount: taxableAmount,
                        net_amount: netAmount
                    },
                    batch: itemRow.batch_number ? {
                        batch_id: itemRow.batch_id,
                        batch_number: itemRow.batch_number,
                        manufacturing_date: itemRow.manufacturing_date,
                        expiry_date: itemRow.expiry_date,
                        batch_quantity: qty + parseFloat(itemRow.free_quantity),
                        remaining_quantity: qty + parseFloat(itemRow.free_quantity) // dynamically managed
                    } : null,
                    expiry: itemRow.expiry_tracking ? {
                        is_expired: isExpired,
                        days_to_expiry: daysToExpiry,
                        expiry_status: expiryStatus
                    } : null,
                    status: {
                        item_status: itemRow.item_status
                    },
                    audit: {
                        created_at: itemRow.created_at,
                        updated_at: itemRow.updated_at
                    }
                });
            }

            // Retrieve Audit History for this Purchase
            const auditQuery = `
                SELECT action, performed_by, remarks, created_at
                FROM ration_purchase_audit_logs
                WHERE purchase_id = $1
                ORDER BY id DESC
            `;
            const audits = await client.query(auditQuery, [id]);
            purchase.audit_history = audits.rows;

            return purchase;
        } catch (error) {
            throw error;
        }
    },

    updateRationPurchase: async (id, institutionId, purchaseData, itemsData, updatedBy, client) => {
        if (!client) {
            return await db.transaction(async (trxClient) => {
                return await RationPurchaseModel.updateRationPurchase(id, institutionId, purchaseData, itemsData, updatedBy, trxClient);
            });
        }
        const localClient = client;

        try {

            // Fetch old record for audit logging
            const oldRecord = await RationPurchaseModel.getRationPurchaseById(id, institutionId, localClient);
            if (!oldRecord) {
                throw new Error("Purchase order not found");
            }
            if (oldRecord.status !== "draft") {
                throw new Error("Only draft purchases can be modified");
            }

            // Calculate new financial totals
            let subTotal = 0;
            let discountAmount = 0;
            let gstAmount = 0;

            const processedItems = [];

            for (const item of itemsData) {
                const qty = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.unit_price) || 0;
                const discPct = parseFloat(item.discount_percentage) || 0;
                const gstPct = parseFloat(item.gst_percentage) || 0;

                const grossAmount = qty * price;
                const itemDiscVal = grossAmount * (discPct / 100);
                const taxableAmount = grossAmount - itemDiscVal;
                const itemGstVal = taxableAmount * (gstPct / 100);
                const lineTotal = taxableAmount + itemGstVal;

                subTotal += grossAmount;
                discountAmount += itemDiscVal;
                gstAmount += itemGstVal;

                processedItems.push({
                    ...item,
                    discount_amount: itemDiscVal,
                    gst_amount: itemGstVal,
                    line_total: lineTotal
                });
            }

            const otherCharges = parseFloat(purchaseData.other_charges) || 0;
            const tempGrandTotal = subTotal - discountAmount + gstAmount + otherCharges;
            const grandTotal = Math.round(tempGrandTotal);
            const roundOff = grandTotal - tempGrandTotal;

            const paidAmount = parseFloat(purchaseData.paid_amount) || 0;
            const balanceAmount = grandTotal - paidAmount;

            let paymentStatus = "unpaid";
            if (paidAmount >= grandTotal) {
                paymentStatus = "paid";
            } else if (paidAmount > 0) {
                paymentStatus = "partially_paid";
            }

            // Update purchase header
            const headerQuery = `
                UPDATE ration_purchases
                SET
                    purchase_date = $1,
                    supplier_id = $2,
                    supplier_invoice_number = $3,
                    invoice_date = $4,
                    notes = $5,
                    sub_total = $6,
                    discount_amount = $7,
                    gst_amount = $8,
                    other_charges = $9,
                    round_off = $10,
                    grand_total = $11,
                    paid_amount = $12,
                    balance_amount = $13,
                    payment_status = $14,
                    status = $15,
                    version = version + 1,
                    updated_by = $16,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $17 AND institution_id = $18
                RETURNING *
            `;

            const headerValues = [
                purchaseData.purchase_date,
                purchaseData.supplier_id,
                purchaseData.supplier_invoice_number || null,
                purchaseData.invoice_date || null,
                purchaseData.notes || null,
                subTotal,
                discountAmount,
                gstAmount,
                otherCharges,
                roundOff,
                grandTotal,
                paidAmount,
                balanceAmount,
                paymentStatus,
                purchaseData.status || "draft",
                updatedBy,
                id,
                institutionId
            ];

            const headerResult = await localClient.query(headerQuery, headerValues);
            const purchase = headerResult.rows[0];

            // Clean previous items
            await localClient.query(`DELETE FROM ration_purchase_items WHERE purchase_id = $1`, [id]);

            const insertedItems = [];
            const inventoryTransactionIds = [];

            // Re-insert items and update stocks/batches if completed
            for (const item of processedItems) {
                let batchId = null;
                const totalQty = item.quantity + (item.free_quantity || 0);

                if (item.batch_number) {
                    const batchCheckQuery = `
                        SELECT id FROM ration_item_batches
                        WHERE institution_id = $1 AND item_id = $2 AND batch_number = $3
                    `;
                    const batchCheck = await localClient.query(batchCheckQuery, [
                        institutionId,
                        item.item_id,
                        item.batch_number.trim()
                    ]);

                    if (batchCheck.rows.length > 0) {
                        batchId = batchCheck.rows[0].id;
                        if (purchase.status === "completed") {
                            await localClient.query(`
                                UPDATE ration_item_batches
                                SET remaining_quantity = remaining_quantity + $1,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = $2
                            `, [totalQty, batchId]);
                        }
                    } else {
                        const batchInsertQuery = `
                            INSERT INTO ration_item_batches (
                                institution_id,
                                item_id,
                                batch_number,
                                manufacturing_date,
                                expiry_date,
                                initial_quantity,
                                remaining_quantity,
                                status
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
                            RETURNING id
                        `;
                        const initialQty = purchase.status === "completed" ? totalQty : 0;
                        const batchInsert = await localClient.query(batchInsertQuery, [
                            institutionId,
                            item.item_id,
                            item.batch_number.trim(),
                            item.manufacturing_date || null,
                            item.expiry_date || null,
                            initialQty,
                            initialQty
                        ]);
                        batchId = batchInsert.rows[0].id;
                    }
                }

                const itemInsertQuery = `
                    INSERT INTO ration_purchase_items (
                        purchase_id,
                        item_id,
                        batch_id,
                        quantity,
                        free_quantity,
                        received_quantity,
                        unit_price,
                        discount_percentage,
                        discount_amount,
                        gst_percentage,
                        gst_amount,
                        line_total
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `;
                const itemInsertValues = [
                    id,
                    item.item_id,
                    batchId,
                    item.quantity,
                    item.free_quantity || 0,
                    purchase.status === "completed" ? totalQty : 0,
                    item.unit_price,
                    item.discount_percentage || 0,
                    item.discount_amount,
                    item.gst_percentage || 0,
                    item.gst_amount,
                    item.line_total
                ];
                const itemResult = await localClient.query(itemInsertQuery, itemInsertValues);
                insertedItems.push(itemResult.rows[0]);

                if (purchase.status === "completed") {
                    const openingStock = await RationPurchaseModel.getCurrentStock(
                        item.item_id,
                        institutionId,
                        localClient
                    );
                    const closingStock = openingStock + totalQty;

                    const ledgerQuery = `
                        INSERT INTO ration_stock_ledger (
                            institution_id,
                            item_id,
                            batch_id,
                            reference_type,
                            reference_id,
                            reference_number,
                            opening_stock,
                            quantity_in,
                            quantity_out,
                            closing_stock,
                            created_by
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING id
                    `;
                    const ledgerValues = [
                        institutionId,
                        item.item_id,
                        batchId,
                        "PURCHASE",
                        id,
                        purchase.purchase_number,
                        openingStock,
                        totalQty,
                        0,
                        closingStock,
                        updatedBy
                    ];
                    const ledgerResult = await localClient.query(ledgerQuery, ledgerValues);
                    inventoryTransactionIds.push(ledgerResult.rows[0].id);

                    const stockTxQuery = `
                        INSERT INTO ration_stock_transactions (
                            institution_id,
                            item_id,
                            transaction_type,
                            reference_type,
                            reference_id,
                            reference_number,
                            quantity_in,
                            quantity_out,
                            unit_price,
                            batch_number,
                            expiry_date,
                            created_by
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `;
                    await localClient.query(stockTxQuery, [
                        institutionId,
                        item.item_id,
                        "PURCHASE",
                        "PURCHASE",
                        id,
                        purchase.purchase_number,
                        totalQty,
                        0,
                        item.unit_price,
                        item.batch_number || null,
                        item.expiry_date || null,
                        updatedBy
                    ]);
                }
            }

            // Create Audit Log
            await RationPurchaseModel.createAuditLog({
                institution_id: institutionId,
                purchase_id: id,
                action: "PURCHASE_UPDATED",
                performed_by: updatedBy,
                old_values: oldRecord,
                new_values: { purchase, items: insertedItems },
                remarks: `Purchase updated to version ${purchase.version} with status ${purchase.status}`
            }, localClient);

            if (isOwnClient) {
                await localClient.query("COMMIT");
            }

            const fullPurchase = await RationPurchaseModel.getRationPurchaseById(id, institutionId, localClient);

            if (purchase.status === "completed") {
                fullPurchase.inventory_integration = {
                    inventory_transaction_id: inventoryTransactionIds[0] || null,
                    stock_transaction_ids: inventoryTransactionIds,
                    inventory_updated: true,
                    stock_added: insertedItems.reduce((acc, it) => acc + parseFloat(it.quantity) + parseFloat(it.free_quantity), 0)
                };
            }

            return fullPurchase;
        } catch (error) {
            throw error;
        }
    },

    deleteRationPurchase: async (id, institutionId, performedBy) => {
        return await db.transaction(async (client) => {
            // Verify exists and is draft
            const checkQuery = `
                SELECT status, purchase_number FROM ration_purchases
                WHERE id = $1 AND institution_id = $2
            `;
            const checkResult = await client.query(checkQuery, [id, institutionId]);
            if (checkResult.rows.length === 0) {
                throw new Error("Purchase not found");
            }
            const record = checkResult.rows[0];

            if (record.status !== "draft") {
                throw new Error("Only draft purchases can be deleted");
            }

            // Verify if any inventory is consumed (though draft has 0 stock impact, let's keep it safe)
            const itemsQuery = `
                SELECT item_id, batch_id FROM ration_purchase_items WHERE purchase_id = $1
            `;
            const itemsResult = await client.query(itemsQuery, [id]);

            for (const item of itemsResult.rows) {
                const consumed = await RationPurchaseModel.isInventoryConsumed(
                    item.item_id,
                    item.batch_id,
                    institutionId,
                    client
                );
                if (consumed) {
                    throw new Error("Cannot delete purchase order: items have already been consumed or adjusted");
                }
            }

            // Delete auditing
            await RationPurchaseModel.createAuditLog({
                institution_id: institutionId,
                purchase_id: id,
                action: "PURCHASE_DELETED",
                performed_by: performedBy,
                remarks: `Draft purchase ${record.purchase_number} was permanently deleted.`
            }, client);

            const deleteQuery = `
                DELETE FROM ration_purchases
                WHERE id = $1 AND institution_id = $2
                RETURNING *
            `;
            const result = await client.query(deleteQuery, [id, institutionId]);

            return result.rows[0];
        });
    },

    completeRationPurchase: async (id, institutionId, updatedBy) => {
        return await db.transaction(async (client) => {
            const checkQuery = `
                SELECT status, purchase_number FROM ration_purchases
                WHERE id = $1 AND institution_id = $2
            `;
            const checkResult = await client.query(checkQuery, [id, institutionId]);
            if (checkResult.rows.length === 0) {
                throw new Error("Purchase not found");
            }
            if (checkResult.rows[0].status !== "draft") {
                throw new Error("Only draft purchases can be completed");
            }

            // Update header status
            const updateQuery = `
                UPDATE ration_purchases
                SET
                    status = 'completed',
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND institution_id = $3
                RETURNING *
            `;
            const updateResult = await client.query(updateQuery, [updatedBy, id, institutionId]);
            const purchase = updateResult.rows[0];

            // Get purchase items
            const itemsQuery = `
                SELECT rpi.id, rpi.item_id, rpi.quantity, rpi.free_quantity, rib.batch_number, rib.id as batch_id, rpi.unit_price, rib.expiry_date
                FROM ration_purchase_items rpi
                LEFT JOIN ration_item_batches rib ON rpi.batch_id = rib.id
                WHERE rpi.purchase_id = $1
            `;
            const itemsResult = await client.query(itemsQuery, [id]);

            const inventoryTransactionIds = [];

            // Update batches and stock ledger
            for (const item of itemsResult.rows) {
                const totalQty = parseFloat(item.quantity) + parseFloat(item.free_quantity || 0);

                // Update Batch Quantity
                if (item.batch_id) {
                    await client.query(`
                        UPDATE ration_item_batches
                        SET remaining_quantity = remaining_quantity + $1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `, [totalQty, item.batch_id]);
                }

                // Update items received quantity
                await client.query(`
                    UPDATE ration_purchase_items
                    SET received_quantity = $1
                    WHERE id = $2
                `, [totalQty, item.id]);

                // Create Stock Ledger Log
                const openingStock = await RationPurchaseModel.getCurrentStock(
                    item.item_id,
                    institutionId,
                    client
                );
                const closingStock = openingStock + totalQty;

                const ledgerQuery = `
                    INSERT INTO ration_stock_ledger (
                        institution_id,
                        item_id,
                        batch_id,
                        reference_type,
                        reference_id,
                        reference_number,
                        opening_stock,
                        quantity_in,
                        quantity_out,
                        closing_stock,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING id
                `;
                const ledgerValues = [
                    institutionId,
                    item.item_id,
                    item.batch_id,
                    "PURCHASE",
                    id,
                    purchase.purchase_number,
                    openingStock,
                    totalQty,
                    0,
                    closingStock,
                    updatedBy
                ];
                const ledgerResult = await client.query(ledgerQuery, ledgerValues);
                inventoryTransactionIds.push(ledgerResult.rows[0].id);

                const stockTxQuery = `
                    INSERT INTO ration_stock_transactions (
                        institution_id,
                        item_id,
                        transaction_type,
                        reference_type,
                        reference_id,
                        reference_number,
                        quantity_in,
                        quantity_out,
                        unit_price,
                        batch_number,
                        expiry_date,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `;
                await client.query(stockTxQuery, [
                    institutionId,
                    item.item_id,
                    "PURCHASE",
                    "PURCHASE",
                    id,
                    purchase.purchase_number,
                    totalQty,
                    0,
                    item.unit_price,
                    item.batch_number || null,
                    item.expiry_date || null,
                    updatedBy
                ]);
            }

            // Create Audit Log
            await RationPurchaseModel.createAuditLog({
                institution_id: institutionId,
                purchase_id: id,
                action: "PURCHASE_APPROVED",
                performed_by: updatedBy,
                remarks: `Purchase approved & completed. Stocks updated.`
            }, client);

            const fullPurchase = await RationPurchaseModel.getRationPurchaseById(id, institutionId, client);
            fullPurchase.inventory_integration = {
                inventory_transaction_id: inventoryTransactionIds[0] || null,
                stock_transaction_ids: inventoryTransactionIds,
                inventory_updated: true,
                stock_added: itemsResult.rows.reduce((acc, it) => acc + parseFloat(it.quantity) + parseFloat(it.free_quantity || 0), 0)
            };

            return fullPurchase;
        });
    },

    cancelRationPurchase: async (id, institutionId, updatedBy, reason = "") => {
        return await db.transaction(async (client) => {
            // Verify exists and is completed
            const checkQuery = `
                SELECT status, purchase_number FROM ration_purchases
                WHERE id = $1 AND institution_id = $2
            `;
            const checkResult = await client.query(checkQuery, [id, institutionId]);
            if (checkResult.rows.length === 0) {
                throw new Error("Purchase not found");
            }
            if (checkResult.rows[0].status !== "completed") {
                throw new Error("Only completed purchases can be cancelled");
            }

            // Get items
            const itemsQuery = `
                SELECT rpi.id, rpi.item_id, rpi.quantity, rpi.free_quantity, rpi.batch_id, rpi.unit_price, rib.batch_number, rib.expiry_date
                FROM ration_purchase_items rpi
                LEFT JOIN ration_item_batches rib ON rpi.batch_id = rib.id
                WHERE rpi.purchase_id = $1
            `;
            const itemsResult = await client.query(itemsQuery, [id]);

            // Validate that we have enough remaining batch stock to reverse!
            for (const item of itemsResult.rows) {
                const totalQty = parseFloat(item.quantity) + parseFloat(item.free_quantity || 0);

                if (item.batch_id) {
                    const batchCheck = await client.query(`
                        SELECT remaining_quantity, batch_number FROM ration_item_batches
                        WHERE id = $1
                    `, [item.batch_id]);

                    if (batchCheck.rows.length > 0) {
                        const remaining = parseFloat(batchCheck.rows[0].remaining_quantity);
                        if (remaining < totalQty) {
                            throw new Error(`Cannot cancel purchase order: Batch '${batchCheck.rows[0].batch_number}' has already been consumed and has insufficient stock (Required: ${totalQty}, Available: ${remaining})`);
                        }
                    }
                }
            }

            // Update status to cancelled
            const updateQuery = `
                UPDATE ration_purchases
                SET
                    status = 'cancelled',
                    cancellation_reason = $1,
                    updated_by = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND institution_id = $4
                RETURNING *
            `;
            const updateResult = await client.query(updateQuery, [reason || null, updatedBy, id, institutionId]);
            const purchase = updateResult.rows[0];

            const inventoryTransactionIds = [];

            // Reverse batch stocks and stock ledger
            for (const item of itemsResult.rows) {
                const totalQty = parseFloat(item.quantity) + parseFloat(item.free_quantity || 0);

                if (item.batch_id) {
                    await client.query(`
                        UPDATE ration_item_batches
                        SET remaining_quantity = remaining_quantity - $1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `, [totalQty, item.batch_id]);
                }

                // Log reversal in Stock Ledger (quantity_out)
                const openingStock = await RationPurchaseModel.getCurrentStock(
                    item.item_id,
                    institutionId,
                    client
                );
                const closingStock = openingStock - totalQty;

                const ledgerQuery = `
                    INSERT INTO ration_stock_ledger (
                        institution_id,
                        item_id,
                        batch_id,
                        reference_type,
                        reference_id,
                        reference_number,
                        opening_stock,
                        quantity_in,
                        quantity_out,
                        closing_stock,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING id
                `;
                const ledgerValues = [
                    institutionId,
                    item.item_id,
                    item.batch_id,
                    "PURCHASE_CANCEL",
                    id,
                    purchase.purchase_number,
                    openingStock,
                    0,
                    totalQty,
                    closingStock,
                    updatedBy
                ];
                const ledgerResult = await client.query(ledgerQuery, ledgerValues);
                inventoryTransactionIds.push(ledgerResult.rows[0].id);

                const stockTxQuery = `
                    INSERT INTO ration_stock_transactions (
                        institution_id,
                        item_id,
                        transaction_type,
                        reference_type,
                        reference_id,
                        reference_number,
                        quantity_in,
                        quantity_out,
                        unit_price,
                        batch_number,
                        expiry_date,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `;
                await client.query(stockTxQuery, [
                    institutionId,
                    item.item_id,
                    "PURCHASE_CANCEL",
                    "PURCHASE",
                    id,
                    purchase.purchase_number,
                    0,
                    totalQty,
                    item.unit_price,
                    item.batch_number || null,
                    item.expiry_date || null,
                    updatedBy
                ]);
            }

            // Create Audit Log
            await RationPurchaseModel.createAuditLog({
                institution_id: institutionId,
                purchase_id: id,
                action: "PURCHASE_CANCELLED",
                performed_by: updatedBy,
                remarks: `Purchase cancelled. Stocks reversed. Reason: ${reason || "None specified"}`
            }, client);

            const fullPurchase = await RationPurchaseModel.getRationPurchaseById(id, institutionId, client);
            fullPurchase.inventory_integration = {
                inventory_transaction_id: inventoryTransactionIds[0] || null,
                stock_transaction_ids: inventoryTransactionIds,
                inventory_updated: true,
                stock_added: -itemsResult.rows.reduce((acc, it) => acc + parseFloat(it.quantity) + parseFloat(it.free_quantity || 0), 0)
            };

            return fullPurchase;
        });
    },

    getPurchaseDashboardData: async (institutionId) => {
        try {
            // 1. Analytics counts & values
            const summaryQuery = `
                SELECT
                    COALESCE(COUNT(CASE WHEN purchase_date = CURRENT_DATE THEN 1 END), 0)::integer as purchases_today_count,
                    COALESCE(SUM(CASE WHEN purchase_date = CURRENT_DATE AND status != 'cancelled' THEN grand_total ELSE 0 END), 0)::numeric as purchases_today_value,
                    COALESCE(COUNT(CASE WHEN DATE_TRUNC('month', purchase_date) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END), 0)::integer as purchases_month_count,
                    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', purchase_date) = DATE_TRUNC('month', CURRENT_DATE) AND status != 'cancelled' THEN grand_total ELSE 0 END), 0)::numeric as purchases_month_value,
                    COALESCE(SUM(CASE WHEN status != 'cancelled' THEN balance_amount ELSE 0 END), 0)::numeric as pending_payment_amount,
                    COALESCE(COUNT(CASE WHEN status = 'draft' THEN 1 END), 0)::integer as draft_purchases_count,
                    COALESCE(COUNT(CASE WHEN status = 'cancelled' THEN 1 END), 0)::integer as cancelled_purchases_count
                FROM ration_purchases
                WHERE institution_id = $1
            `;
            const summaryResult = await pool.query(summaryQuery, [institutionId]);
            const summary = summaryResult.rows[0];

            // 2. Recent purchases
            const recentQuery = `
                SELECT
                    rp.id,
                    rp.purchase_number,
                    rp.purchase_date,
                    rs.supplier_name,
                    rp.grand_total,
                    rp.status
                FROM ration_purchases rp
                INNER JOIN ration_suppliers rs ON rp.supplier_id = rs.id
                WHERE rp.institution_id = $1
                ORDER BY rp.id DESC
                LIMIT 5
            `;
            const recentResult = await pool.query(recentQuery, [institutionId]);

            // 3. Top purchased items
            const topItemsQuery = `
                SELECT
                    ri.item_name,
                    SUM(rpi.quantity)::numeric as total_qty,
                    SUM(rpi.line_total)::numeric as total_spent
                FROM ration_purchase_items rpi
                INNER JOIN ration_items ri ON rpi.item_id = ri.id
                INNER JOIN ration_purchases rp ON rpi.purchase_id = rp.id
                WHERE rp.institution_id = $1 AND rp.status = 'completed'
                GROUP BY ri.item_name
                ORDER BY total_spent DESC
                LIMIT 5
            `;
            const topItemsResult = await pool.query(topItemsQuery, [institutionId]);

            // 4. Supplier-wise purchase breakdown
            const supplierBreakdownQuery = `
                SELECT
                    rs.supplier_name,
                    SUM(rp.grand_total)::numeric as total_value,
                    COUNT(rp.id)::integer as purchases_count
                FROM ration_purchases rp
                INNER JOIN ration_suppliers rs ON rp.supplier_id = rs.id
                WHERE rp.institution_id = $1 AND rp.status != 'cancelled'
                GROUP BY rs.supplier_name
                ORDER BY total_value DESC
                LIMIT 5
            `;
            const supplierBreakdownResult = await pool.query(supplierBreakdownQuery, [institutionId]);

            return {
                summary,
                recentPurchases: recentResult.rows,
                topItems: topItemsResult.rows,
                supplierBreakdown: supplierBreakdownResult.rows
            };
        } catch (error) {
            throw error;
        }
    },

    checkCategoryActive: async (categoryId) => {
        const queryText = "SELECT status FROM ration_item_categories WHERE id = $1";
        const result = await db.query(queryText, [categoryId]);
        return result.rows[0]?.status === "active";
    },

    checkUnitActive: async (unitId) => {
        const queryText = "SELECT status FROM ration_units WHERE id = $1";
        const result = await db.query(queryText, [unitId]);
        return result.rows[0]?.status === "active";
    }
};

module.exports = RationPurchaseModel;
