-- Clean drop old tables to rebuild schemas cleanly
DROP TABLE IF EXISTS ration_purchase_audit_logs CASCADE;
DROP TABLE IF EXISTS ration_stock_ledger CASCADE;
DROP TABLE IF EXISTS ration_purchase_items CASCADE;
DROP TABLE IF EXISTS ration_purchases CASCADE;
DROP TABLE IF EXISTS ration_item_batches CASCADE;
DROP TABLE IF EXISTS ration_purchase_sequences CASCADE;

-- 1. Table for Item Batches
CREATE TABLE IF NOT EXISTS ration_item_batches (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES ration_items(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE,
    initial_quantity NUMERIC(12, 3) DEFAULT 0,
    remaining_quantity NUMERIC(12, 3) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, item_id, batch_number)
);

-- 2. Table for Purchases (Upgraded)
CREATE TABLE IF NOT EXISTS ration_purchases (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,
    purchase_number VARCHAR(50) NOT NULL,
    purchase_date DATE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES ration_suppliers(id) ON DELETE RESTRICT,
    supplier_invoice_number VARCHAR(100),
    invoice_date DATE,
    notes TEXT,
    sub_total NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    gst_amount NUMERIC(12, 2) DEFAULT 0,
    other_charges NUMERIC(12, 2) DEFAULT 0,
    round_off NUMERIC(12, 2) DEFAULT 0,
    grand_total NUMERIC(12, 2) DEFAULT 0,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    balance_amount NUMERIC(12, 2) DEFAULT 0,
    payment_status VARCHAR(30) DEFAULT 'unpaid',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
    cancellation_reason TEXT,
    version INTEGER DEFAULT 1,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, purchase_number)
);

-- 3. Table for Purchase Items (Upgraded)
CREATE TABLE IF NOT EXISTS ration_purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES ration_purchases(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES ration_items(id) ON DELETE RESTRICT,
    batch_id INTEGER REFERENCES ration_item_batches(id) ON DELETE SET NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    free_quantity NUMERIC(12, 3) DEFAULT 0,
    received_quantity NUMERIC(12, 3) DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    gst_percentage NUMERIC(5, 2) DEFAULT 0,
    gst_amount NUMERIC(12, 2) DEFAULT 0,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table for Stock Ledger
CREATE TABLE IF NOT EXISTS ration_stock_ledger (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES ration_items(id) ON DELETE RESTRICT,
    batch_id INTEGER REFERENCES ration_item_batches(id) ON DELETE SET NULL,
    reference_type VARCHAR(50) NOT NULL, -- PURCHASE, PURCHASE_CANCEL
    reference_id INTEGER NOT NULL, -- purchase_id
    reference_number VARCHAR(100) NOT NULL,
    opening_stock NUMERIC(12, 3) NOT NULL,
    quantity_in NUMERIC(12, 3) DEFAULT 0,
    quantity_out NUMERIC(12, 3) DEFAULT 0,
    closing_stock NUMERIC(12, 3) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table for Purchase Audit Logs
CREATE TABLE IF NOT EXISTS ration_purchase_audit_logs (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    purchase_id INTEGER NOT NULL REFERENCES ration_purchases(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- PURCHASE_CREATED, PURCHASE_UPDATED, PURCHASE_DELETED, PURCHASE_CANCELLED, PURCHASE_APPROVED, INVENTORY_UPDATED
    performed_by INTEGER,
    old_values JSONB,
    new_values JSONB,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sequence table for Purchase Numbers
CREATE TABLE IF NOT EXISTS ration_purchase_sequences (
    institution_id INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ration_item_batches_item ON ration_item_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_ration_item_batches_num ON ration_item_batches(institution_id, item_id, batch_number);
CREATE INDEX IF NOT EXISTS idx_ration_purchases_institution ON ration_purchases(institution_id);
CREATE INDEX IF NOT EXISTS idx_ration_purchases_status ON ration_purchases(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ration_purchase_items_purchase ON ration_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_ration_stock_ledger_item ON ration_stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_ration_stock_ledger_batch ON ration_stock_ledger(batch_id);

-- Menu Seeding Logic (Purchases child menu 205 under Ration Inventory 200)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (205, 200, 1, 'Purchases', 5, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Reorder other master menus for correct display order
UPDATE urmg_menus SET priority = 1 WHERE menu_id = 201; -- Category Master
UPDATE urmg_menus SET priority = 2 WHERE menu_id = 203; -- Unit Master
UPDATE urmg_menus SET priority = 3 WHERE menu_id = 202; -- Item Master
UPDATE urmg_menus SET priority = 4 WHERE menu_id = 204; -- Supplier Master

-- Insert actions for Purchases
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (205, 1, 1, 1, 1),
    (205, 2, 2, 1, 1),
    (205, 3, 3, 1, 1),
    (205, 4, 4, 1, 1),
    (205, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Grant permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 205, 1, 2, 1, 1),
    (1, 205, 2, 2, 1, 1),
    (1, 205, 3, 2, 1, 1),
    (1, 205, 4, 2, 1, 1),
    (1, 205, 5, 2, 1, 1),
    (2, 205, 1, 2, 1, 1),
    (2, 205, 2, 2, 1, 1),
    (2, 205, 3, 2, 1, 1),
    (2, 205, 4, 2, 1, 1),
    (2, 205, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
