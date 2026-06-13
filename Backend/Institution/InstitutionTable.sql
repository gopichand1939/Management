CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    institution_name VARCHAR(150) NOT NULL,
    institution_code VARCHAR(50) UNIQUE,
    institution_type VARCHAR(50),
    email VARCHAR(150),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    manager_name VARCHAR(150),
    manager_phone VARCHAR(20),
    logo TEXT,
    status VARCHAR(30) DEFAULT 'active',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS institution_type VARCHAR(50);

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150);

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(20);

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS logo TEXT;

CREATE TABLE IF NOT EXISTS floors (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    floor_name VARCHAR(100) NOT NULL,
    floor_number INTEGER NOT NULL,
    gender_type VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    room_number VARCHAR(50) NOT NULL,
    room_type VARCHAR(50),
    capacity INTEGER,
    rent_amount NUMERIC(12, 2),
    attached_bathroom BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    bed_type VARCHAR(50),
    rent_override NUMERIC(12, 2),
    status VARCHAR(30) NOT NULL DEFAULT 'vacant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS floors_institution_floor_number_key
ON floors(institution_id, floor_number);

CREATE UNIQUE INDEX IF NOT EXISTS rooms_floor_room_number_key
ON rooms(floor_id, room_number);

CREATE UNIQUE INDEX IF NOT EXISTS beds_room_bed_number_key
ON beds(room_id, bed_number);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_super_admins_institution'
    ) THEN
        ALTER TABLE super_admins
        ADD CONSTRAINT fk_super_admins_institution
FOREIGN KEY (institution_id)
REFERENCES institutions(id)
ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_super_admins_pg_admin'
    ) THEN
        ALTER TABLE super_admins
        ADD CONSTRAINT fk_super_admins_pg_admin
FOREIGN KEY (pg_admin_id)
REFERENCES pg_admin(id)
ON DELETE SET NULL;
    END IF;
END $$;
