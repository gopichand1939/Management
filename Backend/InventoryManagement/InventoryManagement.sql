CREATE TABLE IF NOT EXISTS inventory_management (
    id SERIAL PRIMARY KEY,
    inventory_id VARCHAR(50) UNIQUE,
    institution_id INTEGER NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    floor_id INTEGER,
    floor_label VARCHAR(100),
    room_no VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    purchase_date DATE NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    supplier_name VARCHAR(150) NOT NULL,
    condition VARCHAR(50) NOT NULL,
    item_photo JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    remarks TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS inventory_id VARCHAR(50);

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS institution_id INTEGER;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS item_name VARCHAR(150);

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS floor_id INTEGER;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS floor_label VARCHAR(100);

ALTER TABLE inventory_management
ALTER COLUMN floor_id DROP NOT NULL;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS room_no VARCHAR(50);

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS purchase_date DATE;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150);

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS condition VARCHAR(50);

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS item_photo JSONB;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS remarks TEXT;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS created_by INTEGER;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE inventory_management
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE inventory_management
SET inventory_id = 'INV-' || LPAD(id::TEXT, 5, '0')
WHERE inventory_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_management_inventory_id_key
ON inventory_management(inventory_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_inventory_management_institution'
    ) THEN
        ALTER TABLE inventory_management
        ADD CONSTRAINT fk_inventory_management_institution
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE inventory_management
DROP CONSTRAINT IF EXISTS inventory_management_floor_id_fkey;

ALTER TABLE inventory_management
DROP CONSTRAINT IF EXISTS fk_inventory_management_floor;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_inventory_management_floor'
    ) THEN
        ALTER TABLE inventory_management
        ADD CONSTRAINT fk_inventory_management_floor
        FOREIGN KEY (floor_id)
        REFERENCES floors(id)
        ON DELETE SET NULL;
    END IF;
END $$;
