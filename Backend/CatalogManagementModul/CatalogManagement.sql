-- 1. Catalog Categories Table
CREATE TABLE IF NOT EXISTS catalog_categories (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,
    category_name VARCHAR(100) NOT NULL,
    category_code VARCHAR(30),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (institution_id, category_name),
    UNIQUE (institution_id, category_code)
);

-- 2. Catalog Items Table
CREATE TABLE IF NOT EXISTS catalog_items (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,
    clover_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    alternate_name VARCHAR(255),
    description TEXT,
    price NUMERIC(10, 2) DEFAULT 0,
    price_type VARCHAR(50) DEFAULT 'Fixed' CHECK (price_type IN ('Fixed', 'Variable', 'Per Unit')),
    price_unit VARCHAR(50),
    cost NUMERIC(10, 2) DEFAULT 0,
    product_code VARCHAR(100),
    sku VARCHAR(100),
    quantity INTEGER DEFAULT 0,
    is_hidden VARCHAR(5) DEFAULT 'No' CHECK (is_hidden IN ('Yes', 'No')),
    default_tax_rates VARCHAR(5) DEFAULT 'Yes' CHECK (default_tax_rates IN ('Yes', 'No')),
    is_non_revenue_item VARCHAR(5) DEFAULT 'No' CHECK (is_non_revenue_item IN ('Yes', 'No')),
    printer_labels VARCHAR(255),
    modifier_groups VARCHAR(255),
    category_id INTEGER REFERENCES catalog_categories(id) ON DELETE SET NULL,
    unit_id INTEGER REFERENCES ration_units(id) ON DELETE SET NULL,
    tax_rates VARCHAR(255),
    variant_attribute VARCHAR(255),
    variant_option VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    barcode VARCHAR(100),
    UNIQUE (institution_id, sku),
    UNIQUE (institution_id, product_code)
);

-- 3. Seed Menu Items for Catalog Management (ID: 400 range)
INSERT INTO urmg_menus (menu_id, parent_menu_id, module_id, menu_name, priority, status, inst_id)
VALUES
    (400, NULL, 1, 'Catalog Management', 8, 1, 1),
    (401, 400, 1, 'Category Master', 1, 1, 1),
    (402, 400, 1, 'Item Master', 2, 1, 1),
    (403, 400, 1, 'Unit Master', 3, 1, 1),
    (404, 400, 1, 'Barcode Printing', 4, 1, 1)
ON CONFLICT (menu_id) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    menu_name = EXCLUDED.menu_name,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status;

-- 4. Seed Menu Actions for Catalog Submenus
-- Actions: 1 = Create, 2 = Edit, 3 = View, 4 = Delete, 5 = List
INSERT INTO urmg_menu_actions (menu_id, action_id, priority, status, inst_id)
VALUES
    -- Category Master Actions
    (401, 1, 1, 1, 1),
    (401, 2, 2, 1, 1),
    (401, 3, 3, 1, 1),
    (401, 4, 4, 1, 1),
    (401, 5, 5, 1, 1),
    -- Item Master Actions
    (402, 1, 1, 1, 1),
    (402, 2, 2, 1, 1),
    (402, 3, 3, 1, 1),
    (402, 4, 4, 1, 1),
    (402, 5, 5, 1, 1),
    -- Unit Master Actions
    (403, 1, 1, 1, 1),
    (403, 2, 2, 1, 1),
    (403, 3, 3, 1, 1),
    (403, 4, 4, 1, 1),
    (403, 5, 5, 1, 1),
    -- Barcode Printing Actions
    (404, 3, 3, 1, 1),
    (404, 5, 5, 1, 1)
ON CONFLICT (menu_id, action_id) DO NOTHING;

-- 5. Grant permissions to Super Admin (Profile 1) and PG Admin (Profile 2)
INSERT INTO urmg_profile_menus_actions (profile_id, menu_id, action_id, is_configuration_only, status, inst_id)
VALUES
    -- Super Admin (1) for Category Master (401)
    (1, 401, 1, 2, 1, 1),
    (1, 401, 2, 2, 1, 1),
    (1, 401, 3, 2, 1, 1),
    (1, 401, 4, 2, 1, 1),
    (1, 401, 5, 2, 1, 1),
    -- Super Admin (1) for Item Master (402)
    (1, 402, 1, 2, 1, 1),
    (1, 402, 2, 2, 1, 1),
    (1, 402, 3, 2, 1, 1),
    (1, 402, 4, 2, 1, 1),
    (1, 402, 5, 2, 1, 1),
    -- Super Admin (1) for Unit Master (403)
    (1, 403, 1, 2, 1, 1),
    (1, 403, 2, 2, 1, 1),
    (1, 403, 3, 2, 1, 1),
    (1, 403, 4, 2, 1, 1),
    (1, 403, 5, 2, 1, 1),
    -- Super Admin (1) for Barcode Printing (404)
    (1, 404, 3, 2, 1, 1),
    (1, 404, 5, 2, 1, 1),

    -- PG Admin (2) for Category Master (401)
    (2, 401, 1, 2, 1, 1),
    (2, 401, 2, 2, 1, 1),
    (2, 401, 3, 2, 1, 1),
    (2, 401, 4, 2, 1, 1),
    (2, 401, 5, 2, 1, 1),
    -- PG Admin (2) for Item Master (402)
    (2, 402, 1, 2, 1, 1),
    (2, 402, 2, 2, 1, 1),
    (2, 402, 3, 2, 1, 1),
    (2, 402, 4, 2, 1, 1),
    (2, 402, 5, 2, 1, 1),
    -- PG Admin (2) for Unit Master (403)
    (2, 403, 1, 2, 1, 1),
    (2, 403, 2, 2, 1, 1),
    (2, 403, 3, 2, 1, 1),
    (2, 403, 4, 2, 1, 1),
    (2, 403, 5, 2, 1, 1),
    -- PG Admin (2) for Barcode Printing (404)
    (2, 404, 3, 2, 1, 1),
    (2, 404, 5, 2, 1, 1)
ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
    is_configuration_only = EXCLUDED.is_configuration_only,
    status = EXCLUDED.status,
    inst_id = EXCLUDED.inst_id;

-- 6. Seed Default Catalog Categories dynamically for all existing institutions
INSERT INTO catalog_categories (institution_id, category_name, category_code, description, status)
SELECT inst.id, vals.name, vals.code, vals.descr, 'active'
FROM institutions inst
CROSS JOIN (
    VALUES
        ('Collectible Figures', 'COLL', 'Collectible and display figures'),
        ('Dolls', 'DOLL', 'Dolls and doll accessories'),
        ('Action Figures', 'ACTN', 'Action figures and play sets'),
        ('Toy Vehicles', 'VEHI', 'Toy cars, trucks, and vehicles'),
        ('Remote Control Toys', 'RC', 'Remote controlled and hobby toys'),
        ('Dinosaur & Animal Toys', 'DINO', 'Dinosaur and animal themed play toys'),
        ('Plush Toys', 'PLUS', 'Stuffed animals and plush items'),
        ('Squishy & Fidget Toys', 'SQUI', 'Stress reliefs, squishies, and fidget items'),
        ('Musical & Electronic Toys', 'ELEC', 'Electronic toys and musical instruments'),
        ('Key Chains & Charms', 'KEY', 'Keychains, pendants, and charms'),
        ('Cards & Trading Cards', 'CARD', 'Trading cards and card games'),
        ('Puzzles & Games', 'PUZZ', 'Board games and puzzle accessories'),
        ('Books', 'BOOK', 'Reading books and coloring templates'),
        ('Cups & Drinkware', 'CUPS', 'Cups, mugs, and drinkware accessories'),
        ('Bags & Packaging', 'BAGS', 'Shopping bags and packaging materials'),
        ('Gift Cards', 'GIFT', 'Store credit and gift cards'),
        ('Batteries & Accessories', 'BATT', 'Power batteries and toy accessories'),
        ('Other Toys', 'OTHR', 'Miscellaneous toys and items')
) AS vals(name, code, descr)
ON CONFLICT (institution_id, category_name) DO NOTHING;
