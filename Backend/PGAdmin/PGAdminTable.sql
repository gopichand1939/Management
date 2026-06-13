CREATE TABLE IF NOT EXISTS pg_admin (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    pg_admin_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255),
    status VARCHAR(30) DEFAULT 'active',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_pg_admin_institution'
    ) THEN
        ALTER TABLE pg_admin
        ADD CONSTRAINT fk_pg_admin_institution
        FOREIGN KEY (institution_id)
        REFERENCES institutions(id)
        ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE pg_admin
ADD COLUMN IF NOT EXISTS password VARCHAR(255);
