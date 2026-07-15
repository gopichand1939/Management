-- Table Definition for ration_kitchen_requests
CREATE TABLE IF NOT EXISTS ration_kitchen_requests (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,
    request_number VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL,
    required_date DATE NOT NULL,
    meal_type_id INTEGER REFERENCES meal_type_master(id) ON DELETE RESTRICT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    requested_by INTEGER REFERENCES user_credentials(id) ON DELETE RESTRICT,
    approved_by INTEGER REFERENCES user_credentials(id) ON DELETE SET NULL,
    approval_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed')),
    remarks TEXT,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, request_number)
);

-- Table Definition for ration_kitchen_request_items
CREATE TABLE IF NOT EXISTS ration_kitchen_request_items (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES ration_kitchen_requests(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES ration_items(id) ON DELETE RESTRICT,
    requested_quantity NUMERIC(12, 3) NOT NULL CHECK (requested_quantity > 0),
    approved_quantity NUMERIC(12, 3) DEFAULT 0 CHECK (approved_quantity >= 0),
    issued_quantity NUMERIC(12, 3) DEFAULT 0 CHECK (issued_quantity >= 0),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence table for Kitchen Request auto-numbering
CREATE TABLE IF NOT EXISTS ration_kitchen_request_sequences (
    institution_id INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ration_kitchen_req_institution ON ration_kitchen_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_ration_kitchen_req_status ON ration_kitchen_requests(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ration_kitchen_req_items ON ration_kitchen_request_items(request_id);

-- Menu Seeding Logic (Kitchen Request child menu 207 under Ration Inventory 200)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (207, 200, 1, 'Kitchen Request', 7, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Insert actions for Kitchen Request
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (207, 1, 1, 1, 1),
    (207, 2, 2, 1, 1),
    (207, 3, 3, 1, 1),
    (207, 4, 4, 1, 1),
    (207, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Grant permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 207, 1, 2, 1, 1),
    (1, 207, 2, 2, 1, 1),
    (1, 207, 3, 2, 1, 1),
    (1, 207, 4, 2, 1, 1),
    (1, 207, 5, 2, 1, 1),
    (2, 207, 1, 2, 1, 1),
    (2, 207, 2, 2, 1, 1),
    (2, 207, 3, 2, 1, 1),
    (2, 207, 4, 2, 1, 1),
    (2, 207, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
