CREATE TABLE IF NOT EXISTS user_credentials (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    institution_id INTEGER,
    super_admin_id INTEGER,
    pg_admin_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_credentials
ADD COLUMN IF NOT EXISTS institution_id INTEGER;

ALTER TABLE user_credentials
ADD COLUMN IF NOT EXISTS super_admin_id INTEGER;

ALTER TABLE user_credentials
ADD COLUMN IF NOT EXISTS pg_admin_id INTEGER;

ALTER TABLE user_credentials
ADD CONSTRAINT user_credentials_role_check
CHECK (role IN ('super_admin', 'pg_admin'));
