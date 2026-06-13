CREATE TABLE IF NOT EXISTS super_admins (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER,
    pg_admin_id INTEGER,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE super_admins
ADD COLUMN IF NOT EXISTS institution_id INTEGER;

ALTER TABLE super_admins
ADD COLUMN IF NOT EXISTS pg_admin_id INTEGER;
