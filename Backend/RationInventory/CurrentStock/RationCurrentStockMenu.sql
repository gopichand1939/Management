-- Seed current stock menu (menu_id 206 under parent 200)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES (206, 200, 1, 'Current Stock', 6, 1, 1)
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
UPDATE urmg_menus SET priority = 5 WHERE menu_id = 205; -- Purchases
UPDATE urmg_menus SET priority = 6 WHERE menu_id = 206; -- Current Stock

-- Clean up previous permissions for menu 206
DELETE FROM urmg_profile_menus_actions WHERE menu_id = 206;
DELETE FROM urmg_menu_actions WHERE menu_id = 206;

-- Seed menu actions (3=View, 5=List)
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (206, 3, 1, 1, 1),
    (206, 5, 2, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- Assign permissions to Profile 1 (Super Admin) and Profile 2 (PG Admin)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    (1, 206, 3, 2, 1, 1),
    (1, 206, 5, 2, 1, 1),
    (2, 206, 3, 2, 1, 1),
    (2, 206, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
