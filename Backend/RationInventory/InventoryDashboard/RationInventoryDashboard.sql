-- Menu Seeding Logic (Inventory Dashboard child menu 211 under Ration Inventory 200)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (211, 200, 1, 'Inventory Dashboard', 11, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Clean up previous permissions for menu 211
DELETE FROM urmg_profile_menus_actions WHERE menu_id = 211;
DELETE FROM urmg_menu_actions WHERE menu_id = 211;

-- Insert actions (View: 3, List: 5) for Inventory Dashboard
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (211, 3, 1, 1, 1),
    (211, 5, 2, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Grant permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 211, 3, 2, 1, 1),
    (1, 211, 5, 2, 1, 1),
    (2, 211, 3, 2, 1, 1),
    (2, 211, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ration_stock_transactions_inst_date ON ration_stock_transactions(institution_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ration_items_inst_status ON ration_items(institution_id, status);
