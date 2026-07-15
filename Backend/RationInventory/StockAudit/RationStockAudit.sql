-- Table Definition for ration_stock_audits
CREATE TABLE IF NOT EXISTS ration_stock_audits (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    audit_number VARCHAR(50) NOT NULL,
    audit_date DATE NOT NULL,
    audit_name VARCHAR(100) NOT NULL,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending', 'approved', 'rejected', 'completed', 'cancelled')),
    created_by INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, audit_number)
);

-- Table Definition for ration_stock_audit_items
CREATE TABLE IF NOT EXISTS ration_stock_audit_items (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES ration_stock_audits(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES ration_items(id) ON DELETE RESTRICT,
    system_stock NUMERIC(12,3) NOT NULL,
    physical_stock NUMERIC(12,3) NOT NULL CHECK (physical_stock >= 0),
    difference_quantity NUMERIC(12,3) NOT NULL,
    adjustment_direction VARCHAR(10) CHECK (adjustment_direction IN ('increase', 'decrease')),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Definition for ration_stock_audit_sequences
CREATE TABLE IF NOT EXISTS ration_stock_audit_sequences (
    institution_id INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ration_stock_audits_institution ON ration_stock_audits(institution_id);
CREATE INDEX IF NOT EXISTS idx_ration_stock_audits_status ON ration_stock_audits(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ration_stock_audit_items_audit ON ration_stock_audit_items(audit_id);

-- Menu Seeding Logic (Stock Audit child menu 210 under Ration Inventory 200)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (210, 200, 1, 'Stock Audit', 10, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Insert actions for Stock Audit
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (210, 1, 1, 1, 1),
    (210, 2, 2, 1, 1),
    (210, 3, 3, 1, 1),
    (210, 4, 4, 1, 1),
    (210, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Grant permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 210, 1, 2, 1, 1),
    (1, 210, 2, 2, 1, 1),
    (1, 210, 3, 2, 1, 1),
    (1, 210, 4, 2, 1, 1),
    (1, 210, 5, 2, 1, 1),
    (2, 210, 1, 2, 1, 1),
    (2, 210, 2, 2, 1, 1),
    (2, 210, 3, 2, 1, 1),
    (2, 210, 4, 2, 1, 1),
    (2, 210, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
