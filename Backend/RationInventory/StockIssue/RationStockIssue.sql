-- Table Definition for ration_stock_issues
CREATE TABLE IF NOT EXISTS ration_stock_issues (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,
    issue_number VARCHAR(50) NOT NULL,
    kitchen_request_id INTEGER NOT NULL REFERENCES ration_kitchen_requests(id) ON DELETE RESTRICT,
    issue_date DATE NOT NULL,
    issued_to INTEGER REFERENCES user_credentials(id) ON DELETE SET NULL,
    meal_type_id INTEGER REFERENCES meal_type_master(id) ON DELETE RESTRICT,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, issue_number)
);

-- Table Definition for ration_stock_issue_items
CREATE TABLE IF NOT EXISTS ration_stock_issue_items (
    id SERIAL PRIMARY KEY,
    stock_issue_id INTEGER NOT NULL REFERENCES ration_stock_issues(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL,
    kitchen_request_item_id INTEGER NOT NULL REFERENCES ration_kitchen_request_items(id) ON DELETE RESTRICT,
    item_id INTEGER NOT NULL REFERENCES ration_items(id) ON DELETE RESTRICT,
    approved_quantity NUMERIC(12,3) NOT NULL CHECK (approved_quantity >= 0),
    previously_issued_quantity NUMERIC(12,3) DEFAULT 0 CHECK (previously_issued_quantity >= 0),
    issue_quantity NUMERIC(12,3) NOT NULL CHECK (issue_quantity > 0),
    unit_price NUMERIC(14,2) DEFAULT 0 CHECK (unit_price >= 0),
    batch_number VARCHAR(100),
    expiry_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table Definition for ration_stock_issue_sequences
CREATE TABLE IF NOT EXISTS ration_stock_issue_sequences (
    institution_id INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update Kitchen Request Status Check Constraint Safely
ALTER TABLE ration_kitchen_requests DROP CONSTRAINT IF EXISTS ration_kitchen_requests_status_check;
ALTER TABLE ration_kitchen_requests ADD CONSTRAINT ration_kitchen_requests_status_check CHECK (status IN ('draft', 'pending', 'approved', 'partially_issued', 'rejected', 'cancelled', 'completed'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ration_stock_issues_institution ON ration_stock_issues(institution_id);
CREATE INDEX IF NOT EXISTS idx_ration_stock_issues_status ON ration_stock_issues(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ration_stock_issue_items_issue ON ration_stock_issue_items(stock_issue_id);

-- Menu Seeding Logic (Stock Issue child menu 208 under Ration Inventory 200)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (208, 200, 1, 'Stock Issue', 8, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Insert actions for Stock Issue
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (208, 1, 1, 1, 1),
    (208, 2, 2, 1, 1),
    (208, 3, 3, 1, 1),
    (208, 4, 4, 1, 1),
    (208, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Grant permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 208, 1, 2, 1, 1),
    (1, 208, 2, 2, 1, 1),
    (1, 208, 3, 2, 1, 1),
    (1, 208, 4, 2, 1, 1),
    (1, 208, 5, 2, 1, 1),
    (2, 208, 1, 2, 1, 1),
    (2, 208, 2, 2, 1, 1),
    (2, 208, 3, 2, 1, 1),
    (2, 208, 4, 2, 1, 1),
    (2, 208, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
