-- Table Definition for ration_purchases
CREATE TABLE IF NOT EXISTS ration_purchases (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,
    purchase_number VARCHAR(50) NOT NULL,
    purchase_date DATE NOT NULL,
    supplier_id INTEGER NOT NULL,
    supplier_invoice_number VARCHAR(100),
    invoice_date DATE,
    notes TEXT,
    sub_total NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    gst_amount NUMERIC(12, 2) DEFAULT 0,
    grand_total NUMERIC(12, 2) DEFAULT 0,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    balance_amount NUMERIC(12, 2) DEFAULT 0,
    payment_status VARCHAR(30) DEFAULT 'unpaid',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, purchase_number)
);

-- Table Definition for ration_purchase_items
CREATE TABLE IF NOT EXISTS ration_purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES ration_purchases(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES ration_items(id),
    quantity NUMERIC(12, 3) NOT NULL,
    free_quantity NUMERIC(12, 3) DEFAULT 0,
    unit_price NUMERIC(12, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) DEFAULT 0,
    gst_percentage NUMERIC(5, 2) DEFAULT 0,
    line_total NUMERIC(12, 2) NOT NULL,
    batch_number VARCHAR(100),
    manufacturing_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Definition for ration_stock_transactions
CREATE TABLE IF NOT EXISTS ration_stock_transactions (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES ration_items(id),
    transaction_type VARCHAR(50) NOT NULL, -- PURCHASE, PURCHASE_CANCEL
    reference_id INTEGER NOT NULL, -- purchase_id
    quantity_in NUMERIC(12, 3) DEFAULT 0,
    quantity_out NUMERIC(12, 3) DEFAULT 0,
    batch_number VARCHAR(100),
    expiry_date DATE,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence table for Purchase Numbers
CREATE TABLE IF NOT EXISTS ration_purchase_sequences (
    institution_id INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ration_purchases_institution ON ration_purchases(institution_id);
CREATE INDEX IF NOT EXISTS idx_ration_purchases_status ON ration_purchases(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ration_purchase_items_purchase ON ration_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_ration_stock_tx_institution ON ration_stock_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_ration_stock_tx_item ON ration_stock_transactions(item_id);

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
