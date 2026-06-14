ALTER TABLE floors
ADD COLUMN IF NOT EXISTS total_rooms INTEGER NOT NULL DEFAULT 0;

ALTER TABLE floors
ADD COLUMN IF NOT EXISTS total_beds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE floors
ADD COLUMN IF NOT EXISTS occupied_beds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE floors
ADD COLUMN IF NOT EXISTS vacant_beds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS occupied_beds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS vacant_beds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE beds
ALTER COLUMN status SET DEFAULT 'vacant';

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS profile_photo JSONB,
ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS refundable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_refund_status VARCHAR(40) NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS checkout_date DATE,
ADD COLUMN IF NOT EXISTS notice_date DATE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_by INTEGER;

ALTER TABLE tenant_payments
ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(120),
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_by INTEGER,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2);

CREATE TABLE IF NOT EXISTS tenant_documents (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    document_name VARCHAR(120) NOT NULL,
    document_type VARCHAR(80) NOT NULL,
    document_number VARCHAR(120),
    file_name VARCHAR(255),
    file_url TEXT,
    mime_type VARCHAR(120),
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_activity_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    action VARCHAR(120) NOT NULL,
    performed_by INTEGER,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_bed_history (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    from_floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
    from_room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    from_bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
    to_floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
    to_room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    to_bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
    transfer_reason TEXT,
    transferred_by INTEGER,
    transferred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_monthly_dues (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    due_month DATE NOT NULL,
    due_date DATE NOT NULL,
    total_rent NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    pending_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tenants_phone_lookup_idx
ON tenants(phone)
WHERE deleted_at IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenants_email_lookup_idx
ON tenants(LOWER(email))
WHERE deleted_at IS NULL AND email IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenants_aadhaar_lookup_idx
ON tenants(aadhaar_number)
WHERE deleted_at IS NULL AND aadhaar_number IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM tenants duplicate_tenants
        WHERE duplicate_tenants.deleted_at IS NULL
          AND duplicate_tenants.phone IS NOT NULL
        GROUP BY duplicate_tenants.phone
        HAVING COUNT(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS tenants_active_phone_unique_idx
        ON tenants(phone)
        WHERE deleted_at IS NULL AND phone IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM tenants duplicate_tenants
        WHERE duplicate_tenants.deleted_at IS NULL
          AND duplicate_tenants.email IS NOT NULL
        GROUP BY LOWER(duplicate_tenants.email)
        HAVING COUNT(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS tenants_active_email_unique_idx
        ON tenants(LOWER(email))
        WHERE deleted_at IS NULL AND email IS NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM tenants duplicate_tenants
        WHERE duplicate_tenants.deleted_at IS NULL
          AND duplicate_tenants.aadhaar_number IS NOT NULL
        GROUP BY duplicate_tenants.aadhaar_number
        HAVING COUNT(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS tenants_active_aadhaar_unique_idx
        ON tenants(aadhaar_number)
        WHERE deleted_at IS NULL AND aadhaar_number IS NOT NULL;
    END IF;
END $$;
