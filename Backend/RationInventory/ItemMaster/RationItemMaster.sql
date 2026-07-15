CREATE TABLE IF NOT EXISTS ration_item_categories (
    id SERIAL PRIMARY KEY,

    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,

    category_name VARCHAR(100) NOT NULL,
    category_code VARCHAR(30),
    description TEXT,

    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_by INTEGER,
    updated_by INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (institution_id, category_name),
    UNIQUE (institution_id, category_code)
);

CREATE TABLE IF NOT EXISTS ration_units (
    id SERIAL PRIMARY KEY,

    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,

    unit_name VARCHAR(100) NOT NULL,
    unit_code VARCHAR(20) NOT NULL,

    allow_decimal BOOLEAN DEFAULT TRUE,

    description TEXT,

    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_by INTEGER,
    updated_by INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (institution_id, unit_name),
    UNIQUE (institution_id, unit_code)
);

CREATE TABLE IF NOT EXISTS ration_items (
    id SERIAL PRIMARY KEY,

    institution_id INTEGER NOT NULL,
    pg_admin_id INTEGER,

    item_name VARCHAR(150) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    sku_id VARCHAR(100) NOT NULL,
    barcode VARCHAR(100) NOT NULL,

    category_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,

    description TEXT,
    image_url TEXT,

    minimum_stock NUMERIC(12, 3) DEFAULT 0,
    maximum_stock NUMERIC(12, 3),
    reorder_quantity NUMERIC(12, 3),

    default_purchase_price NUMERIC(12, 2) DEFAULT 0,
    gst_percentage NUMERIC(5, 2) DEFAULT 0,

    batch_tracking BOOLEAN DEFAULT FALSE,
    expiry_tracking BOOLEAN DEFAULT FALSE,

    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_by INTEGER,
    updated_by INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ration_item_category
        FOREIGN KEY (category_id)
        REFERENCES ration_item_categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_ration_item_unit
        FOREIGN KEY (unit_id)
        REFERENCES ration_units(id)
        ON DELETE RESTRICT,

    UNIQUE (institution_id, item_code),
    UNIQUE (institution_id, barcode),
    UNIQUE (institution_id, sku_id)
);

CREATE TABLE IF NOT EXISTS ration_sku_sequences (
    institution_id INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);