-- Table Definition
CREATE TABLE IF NOT EXISTS ration_suppliers (
    id SERIAL PRIMARY KEY,

    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,

    supplier_name VARCHAR(150) NOT NULL,
    supplier_code VARCHAR(50) NOT NULL,

    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(150),

    gst_number VARCHAR(30),
    pan_number VARCHAR(20),

    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),

    payment_terms VARCHAR(100),
    description TEXT,

    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_by INTEGER,
    updated_by INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (institution_id, supplier_name),
    UNIQUE (institution_id, supplier_code)
);

-- Recommended Indexes
CREATE INDEX IF NOT EXISTS idx_ration_suppliers_institution
ON ration_suppliers(institution_id);

CREATE INDEX IF NOT EXISTS idx_ration_suppliers_status
ON ration_suppliers(institution_id, status);

-- Menu Seeding Logic (Supplier Master child menu 204)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (204, 200, 1, 'Supplier Master', 4, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Reorder other master menus for correct display order
UPDATE urmg_menus SET priority = 2 WHERE menu_id = 203; -- Unit Master
UPDATE urmg_menus SET priority = 3 WHERE menu_id = 202; -- Item Master

-- Insert actions for Supplier Master
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (204, 1, 1, 1, 1),
    (204, 2, 2, 1, 1),
    (204, 3, 3, 1, 1),
    (204, 4, 4, 1, 1),
    (204, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Grant permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 204, 1, 2, 1, 1),
    (1, 204, 2, 2, 1, 1),
    (1, 204, 3, 2, 1, 1),
    (1, 204, 4, 2, 1, 1),
    (1, 204, 5, 2, 1, 1),
    (2, 204, 1, 2, 1, 1),
    (2, 204, 2, 2, 1, 1),
    (2, 204, 3, 2, 1, 1),
    (2, 204, 4, 2, 1, 1),
    (2, 204, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
