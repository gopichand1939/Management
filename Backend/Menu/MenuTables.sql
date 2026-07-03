CREATE TABLE IF NOT EXISTS urmg_actions (
    action_id INTEGER PRIMARY KEY,
    action_name VARCHAR(50) NOT NULL UNIQUE,
    priority INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 1,
    inst_id INTEGER NOT NULL DEFAULT 1
);







CREATE TABLE IF NOT EXISTS urmg_menus (
    menu_id INTEGER PRIMARY KEY,
    parent_menu_id INTEGER,
    module_id INTEGER NOT NULL DEFAULT 1,
    menu_name VARCHAR(100) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 1,
    inst_id INTEGER NOT NULL DEFAULT 1
);








CREATE TABLE IF NOT EXISTS urmg_menu_actions (
    menu_id INTEGER NOT NULL,
    action_id INTEGER NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    status INTEGER NOT NULL DEFAULT 1,
    inst_id INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (menu_id, action_id),
    CONSTRAINT urmg_menu_actions_menu_fk
        FOREIGN KEY (menu_id) REFERENCES urmg_menus(menu_id)
        ON DELETE CASCADE,
    CONSTRAINT urmg_menu_actions_action_fk
        FOREIGN KEY (action_id) REFERENCES urmg_actions(action_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS urmg_profile_menus_actions (
    profile_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    action_id INTEGER NOT NULL,
    is_configuration_only INTEGER NOT NULL DEFAULT 2,
    status INTEGER NOT NULL DEFAULT 1,
    inst_id INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (profile_id, menu_id, action_id),
    CONSTRAINT urmg_profile_menu_actions_menu_fk
        FOREIGN KEY (menu_id, action_id)
        REFERENCES urmg_menu_actions(menu_id, action_id)
        ON DELETE CASCADE
);

DELETE FROM urmg_profile_menus_actions
WHERE menu_id IN (5, 6, 7, 100, 101, 102, 103, 104, 105);

DELETE FROM urmg_menu_actions
WHERE menu_id IN (5, 6, 7, 100, 101, 102, 103, 104, 105);

DELETE FROM urmg_menus
WHERE menu_id IN (5, 6, 7, 100, 101, 102, 103, 104, 105);

INSERT INTO urmg_actions (action_id, action_name, priority, status, inst_id)
VALUES
    (1, 'Create', 1, 1, 1),
    (2, 'Edit', 2, 1, 1),
    (3, 'View', 3, 1, 1),
    (4, 'Delete', 4, 1, 1),
    (5, 'List', 5, 1, 1)
ON CONFLICT (action_id) DO UPDATE SET
    action_name = EXCLUDED.action_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

INSERT INTO urmg_menus (
    menu_id,
    parent_menu_id,
    module_id,
    menu_name,
    priority,
    status,
    inst_id
)
VALUES
    (1, NULL, 1, 'Dashboard', 1, 1, 1),
    (5, NULL, 1, 'UserManagement', 2, 1, 1),
    (2, 5, 1, 'Super Admin', 1, 1, 1),
    (4, 6, 1, 'PG Admin', 2, 1, 1),
    (6, NULL, 1, 'InstitutionManagement', 3, 1, 1),
    (3, 6, 1, 'Institution Master', 1, 1, 1),
    (7, 6, 1, 'Institution Availability', 3, 1, 1),
    (100, NULL, 1, 'ExpenseManagement', 5, 1, 1),
    (101, 100, 1, 'Daily Expenses', 1, 1, 1),
    (104, 100, 1, 'Meal Type Master', 2, 1, 1),
    (105, 100, 1, 'Weekly Food Menu Configuration', 3, 1, 1),
    (102, NULL, 1, 'InventoryManagement', 6, 1, 1),
    (103, 102, 1, 'Inventory Master', 1, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    module_id = EXCLUDED.module_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    (1, 3, 1, 1, 1),
    (2, 1, 1, 1, 1),
    (2, 2, 2, 1, 1),
    (2, 3, 3, 1, 1),
    (2, 4, 4, 1, 1),
    (2, 5, 5, 1, 1),
    (3, 1, 1, 1, 1),
    (3, 2, 2, 1, 1),
    (3, 3, 3, 1, 1),
    (3, 4, 4, 1, 1),
    (3, 5, 5, 1, 1),
    (7, 1, 1, 1, 1),
    (7, 2, 2, 1, 1),
    (7, 3, 3, 1, 1),
    (7, 4, 4, 1, 1),
    (7, 5, 5, 1, 1),
    (4, 1, 1, 1, 1),
    (4, 2, 2, 1, 1),
    (4, 3, 3, 1, 1),
    (4, 4, 4, 1, 1),
    (4, 5, 5, 1, 1),
    (101, 1, 1, 1, 1),
    (101, 2, 2, 1, 1),
    (101, 3, 3, 1, 1),
    (101, 4, 4, 1, 1),
    (101, 5, 5, 1, 1),
    (104, 1, 1, 1, 1),
    (104, 2, 2, 1, 1),
    (104, 3, 3, 1, 1),
    (104, 4, 4, 1, 1),
    (104, 5, 5, 1, 1),
    (105, 1, 1, 1, 1),
    (105, 2, 2, 1, 1),
    (105, 3, 3, 1, 1),
    (105, 4, 4, 1, 1),
    (105, 5, 5, 1, 1),
    (103, 1, 1, 1, 1),
    (103, 2, 2, 1, 1),
    (103, 3, 3, 1, 1),
    (103, 4, 4, 1, 1),
    (103, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

INSERT INTO urmg_profile_menus_actions (
    profile_id,
    menu_id,
    action_id,
    is_configuration_only,
    status,
    inst_id
)
VALUES
    (1, 1, 3, 2, 1, 1),
    (1, 2, 1, 2, 1, 1),
    (1, 2, 2, 2, 1, 1),
    (1, 2, 3, 2, 1, 1),
    (1, 2, 4, 2, 1, 1),
    (1, 2, 5, 2, 1, 1),
    (1, 3, 1, 2, 1, 1),
    (1, 3, 2, 2, 1, 1),
    (1, 3, 3, 2, 1, 1),
    (1, 3, 4, 2, 1, 1),
    (1, 3, 5, 2, 1, 1),
    (1, 7, 1, 2, 1, 1),
    (1, 7, 2, 2, 1, 1),
    (1, 7, 3, 2, 1, 1),
    (1, 7, 4, 2, 1, 1),
    (1, 7, 5, 2, 1, 1),
    (1, 4, 1, 2, 1, 1),
    (1, 4, 2, 2, 1, 1),
    (1, 4, 3, 2, 1, 1),
    (1, 4, 4, 2, 1, 1),
    (1, 4, 5, 2, 1, 1),
    (2, 3, 1, 2, 1, 1),
    (2, 3, 2, 2, 1, 1),
    (2, 3, 3, 2, 1, 1),
    (2, 3, 4, 2, 1, 1),
    (2, 3, 5, 2, 1, 1),
    (2, 7, 1, 2, 1, 1),
    (2, 7, 2, 2, 1, 1),
    (2, 7, 3, 2, 1, 1),
    (2, 7, 4, 2, 1, 1),
    (2, 7, 5, 2, 1, 1),
    (2, 4, 1, 2, 1, 1),
    (2, 4, 2, 2, 1, 1),
    (2, 4, 3, 2, 1, 1),
    (2, 4, 4, 2, 1, 1),
    (2, 4, 5, 2, 1, 1),
    (1, 101, 1, 2, 1, 1),
    (1, 101, 2, 2, 1, 1),
    (1, 101, 3, 2, 1, 1),
    (1, 101, 4, 2, 1, 1),
    (1, 101, 5, 2, 1, 1),
    (2, 101, 1, 2, 1, 1),
    (2, 101, 2, 2, 1, 1),
    (2, 101, 3, 2, 1, 1),
    (2, 101, 4, 2, 1, 1),
    (2, 101, 5, 2, 1, 1),
    (1, 104, 1, 2, 1, 1),
    (1, 104, 2, 2, 1, 1),
    (1, 104, 3, 2, 1, 1),
    (1, 104, 4, 2, 1, 1),
    (1, 104, 5, 2, 1, 1),
    (2, 104, 1, 2, 1, 1),
    (2, 104, 2, 2, 1, 1),
    (2, 104, 3, 2, 1, 1),
    (2, 104, 4, 2, 1, 1),
    (2, 104, 5, 2, 1, 1),
    (1, 105, 1, 2, 1, 1),
    (1, 105, 2, 2, 1, 1),
    (1, 105, 3, 2, 1, 1),
    (1, 105, 4, 2, 1, 1),
    (1, 105, 5, 2, 1, 1),
    (2, 105, 1, 2, 1, 1),
    (2, 105, 2, 2, 1, 1),
    (2, 105, 3, 2, 1, 1),
    (2, 105, 4, 2, 1, 1),
    (2, 105, 5, 2, 1, 1),
    (1, 103, 1, 2, 1, 1),
    (1, 103, 2, 2, 1, 1),
    (1, 103, 3, 2, 1, 1),
    (1, 103, 4, 2, 1, 1),
    (1, 103, 5, 2, 1, 1),
    (2, 103, 1, 2, 1, 1),
    (2, 103, 2, 2, 1, 1),
    (2, 103, 3, 2, 1, 1),
    (2, 103, 4, 2, 1, 1),
    (2, 103, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;
