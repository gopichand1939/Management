-- Table Definition for ration_stock_adjustments
CREATE TABLE IF NOT EXISTS ration_stock_adjustments (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    adjustment_number VARCHAR(50) NOT NULL,
    adjustment_date DATE NOT NULL,
    reason VARCHAR(50) NOT NULL,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
    created_by INTEGER,
    approved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, adjustment_number)
);

-- Table Definition for ration_stock_adjustment_items
CREATE TABLE IF NOT EXISTS ration_stock_adjustment_items (
    id SERIAL PRIMARY KEY,
    stock_adjustment_id INTEGER NOT NULL REFERENCES ration_stock_adjustments(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES ration_items(id) ON DELETE RESTRICT,
    current_stock NUMERIC(12,3) NOT NULL CHECK (current_stock >= 0),
    adjustment_quantity NUMERIC(12,3) NOT NULL CHECK (adjustment_quantity > 0),
    adjustment_direction VARCHAR(10) NOT NULL CHECK (adjustment_direction IN ('increase', 'decrease')),
    previous_stock NUMERIC(12,3) NOT NULL CHECK (previous_stock >= 0),
    new_stock NUMERIC(12,3) NOT NULL CHECK (new_stock >= 0),
    reason VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Definition for ration_stock_adjustment_sequences
CREATE TABLE IF NOT EXISTS ration_stock_adjustment_sequences (
    institution_id INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ration_stock_adjustments_institution ON ration_stock_adjustments(institution_id);
CREATE INDEX IF NOT EXISTS idx_ration_stock_adjustments_status ON ration_stock_adjustments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ration_stock_adjustment_items_adj ON ration_stock_adjustment_items(stock_adjustment_id);

-- Menu Seeding Logic (Stock Adjustment child menu 209 under Ration Inventory 200)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (209, 200, 1, 'Stock Adjustment', 9, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Insert actions for Stock Adjustment
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (209, 1, 1, 1, 1),
    (209, 2, 2, 1, 1),
    (209, 3, 3, 1, 1),
    (209, 4, 4, 1, 1),
    (209, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Grant permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 209, 1, 2, 1, 1),
    (1, 209, 2, 2, 1, 1),
    (1, 209, 3, 2, 1, 1),
    (1, 209, 4, 2, 1, 1),
    (1, 209, 5, 2, 1, 1),
    (2, 209, 1, 2, 1, 1),
    (2, 209, 2, 2, 1, 1),
    (2, 209, 3, 2, 1, 1),
    (2, 209, 4, 2, 1, 1),
    (2, 209, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
