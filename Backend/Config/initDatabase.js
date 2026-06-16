const pool = require("./Database");

const statements = [
    `
        CREATE TABLE IF NOT EXISTS user_credentials (
            id SERIAL PRIMARY KEY,
            email VARCHAR(150) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            institution_id INTEGER,
            super_admin_id INTEGER,
            pg_admin_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    `
        ALTER TABLE pg_admin
        ADD COLUMN IF NOT EXISTS password VARCHAR(255)
    `,
    `
        ALTER TABLE user_credentials
        ADD COLUMN IF NOT EXISTS institution_id INTEGER
    `,
    `
        ALTER TABLE user_credentials
        ADD COLUMN IF NOT EXISTS super_admin_id INTEGER
    `,
    `
        ALTER TABLE user_credentials
        ADD COLUMN IF NOT EXISTS pg_admin_id INTEGER
    `,
    `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'user_credentials_role_check'
            ) THEN
                ALTER TABLE user_credentials
                ADD CONSTRAINT user_credentials_role_check
                CHECK (role IN ('super_admin', 'pg_admin'));
            END IF;
        END $$;
    `,
    `
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
        )
    `,
    `
        ALTER TABLE institutions
        ADD COLUMN IF NOT EXISTS institution_type VARCHAR(50)
    `,
    `
        ALTER TABLE institutions
        ADD COLUMN IF NOT EXISTS city VARCHAR(100)
    `,
    `
        ALTER TABLE institutions
        ADD COLUMN IF NOT EXISTS state VARCHAR(100)
    `,
    `
        ALTER TABLE institutions
        ADD COLUMN IF NOT EXISTS pincode VARCHAR(20)
    `,
    `
        ALTER TABLE institutions
        ADD COLUMN IF NOT EXISTS manager_name VARCHAR(150)
    `,
    `
        ALTER TABLE institutions
        ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(20)
    `,
    `
        ALTER TABLE institutions
        ADD COLUMN IF NOT EXISTS logo TEXT
    `,
    `
        CREATE TABLE IF NOT EXISTS floors (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            floor_name VARCHAR(100) NOT NULL,
            floor_number INTEGER NOT NULL,
            gender_type VARCHAR(30),
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `, 
    `
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
        )
    `,
    `
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
        )
    `,
    `
        ALTER TABLE floors
        ADD COLUMN IF NOT EXISTS total_rooms INTEGER NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE floors
        ADD COLUMN IF NOT EXISTS total_beds INTEGER NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE floors
        ADD COLUMN IF NOT EXISTS occupied_beds INTEGER NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE floors
        ADD COLUMN IF NOT EXISTS vacant_beds INTEGER NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE rooms
        ADD COLUMN IF NOT EXISTS occupied_beds INTEGER NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE rooms
        ADD COLUMN IF NOT EXISTS vacant_beds INTEGER NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE beds
        ALTER COLUMN status SET DEFAULT 'vacant'
    `,
    `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'beds_status_check'
            ) THEN
                ALTER TABLE beds
                ADD CONSTRAINT beds_status_check
                CHECK (status IN ('vacant', 'occupied', 'reserved', 'maintenance'));
            END IF;
        END $$;
    `,
    `
        CREATE UNIQUE INDEX IF NOT EXISTS floors_institution_floor_number_key
        ON floors(institution_id, floor_number)
    `,
    `
        CREATE UNIQUE INDEX IF NOT EXISTS rooms_floor_room_number_key
        ON rooms(floor_id, room_number)
    `,
    `
        CREATE UNIQUE INDEX IF NOT EXISTS beds_room_bed_number_key
        ON beds(room_id, bed_number)
    `,
    `
        CREATE TABLE IF NOT EXISTS tenants (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            floor_id INTEGER REFERENCES floors(id) ON DELETE SET NULL,
            room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
            bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
            admission_number VARCHAR(100) UNIQUE,
            full_name VARCHAR(150) NOT NULL,
            phone VARCHAR(20),
            email VARCHAR(150),
            gender VARCHAR(30),
            date_of_birth DATE,
            occupation VARCHAR(100),
            company_name VARCHAR(150),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(20),
            check_in_date DATE,
            expected_checkout_date DATE,
            guardian_name VARCHAR(150),
            guardian_phone VARCHAR(20),
            guardian_relation VARCHAR(80),
            emergency_contact_name VARCHAR(150),
            emergency_contact_phone VARCHAR(20),
            documents JSONB NOT NULL DEFAULT '[]'::jsonb,
            notes TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS profile_photo JSONB
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(50)
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS deposit_paid NUMERIC(12, 2) NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS refundable_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS deposit_refund_status VARCHAR(40) NOT NULL DEFAULT 'pending'
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS checkout_date DATE
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS notice_date DATE
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS deleted_by INTEGER
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS billing_cycle_type VARCHAR(50) NOT NULL DEFAULT 'anniversary'
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS billing_cycle_anchor_day INTEGER
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS first_cycle_start_date DATE
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS first_cycle_end_date DATE
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS first_cycle_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS agreed_monthly_rent NUMERIC(12, 2) NOT NULL DEFAULT 0
    `,
    `
        ALTER TABLE tenants
        ALTER COLUMN status SET DEFAULT 'pending_verification'
    `,
    `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'tenants_billing_cycle_type_check'
            ) THEN
                ALTER TABLE tenants
                ADD CONSTRAINT tenants_billing_cycle_type_check
                CHECK (billing_cycle_type IN ('anniversary', 'calendar_month_prorated'));
            END IF;
        END $$;
    `,
    `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'tenants_status_check'
            ) THEN
                ALTER TABLE tenants
                ADD CONSTRAINT tenants_status_check
                CHECK (status IN ('draft', 'pending_verification', 'active', 'notice_period', 'vacated', 'blocked'));
            END IF;
        END $$;
    `,
    `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'tenants_deposit_refund_status_check'
            ) THEN
                ALTER TABLE tenants
                ADD CONSTRAINT tenants_deposit_refund_status_check
                CHECK (deposit_refund_status IN ('pending', 'partially_refunded', 'refunded', 'forfeited'));
            END IF;
        END $$;
    `,
    `
        CREATE INDEX IF NOT EXISTS tenants_phone_lookup_idx
        ON tenants(phone)
        WHERE deleted_at IS NULL AND phone IS NOT NULL
    `,
    `
        CREATE INDEX IF NOT EXISTS tenants_email_lookup_idx
        ON tenants(LOWER(email))
        WHERE deleted_at IS NULL AND email IS NOT NULL
    `,
    `
        CREATE INDEX IF NOT EXISTS tenants_aadhaar_lookup_idx
        ON tenants(aadhaar_number)
        WHERE deleted_at IS NULL AND aadhaar_number IS NOT NULL
    `,
    `
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
    `,
    `
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
    `,
    `
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
    `,
    `
        CREATE TABLE IF NOT EXISTS tenant_payments (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            amount NUMERIC(12, 2) NOT NULL,
            payment_type VARCHAR(50) NOT NULL DEFAULT 'rent',
            payment_mode VARCHAR(50),
            payment_date DATE,
            reference_number VARCHAR(120) UNIQUE,
            notes TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'completed',
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(120)
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS payment_proof_url TEXT
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMP
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS verified_by INTEGER
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2)
    `,
    `
        ALTER TABLE tenant_payments
        ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2)
    `,
    `
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'tenant_payments_verification_status_check'
            ) THEN
                ALTER TABLE tenant_payments
                ADD CONSTRAINT tenant_payments_verification_status_check
                CHECK (verification_status IN ('pending', 'verified', 'rejected'));
            END IF;
        END $$;
    `,
    `
        CREATE UNIQUE INDEX IF NOT EXISTS tenant_payments_receipt_number_key
        ON tenant_payments(receipt_number)
        WHERE receipt_number IS NOT NULL
    `,
    `
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
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS tenant_activity_logs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            action VARCHAR(120) NOT NULL,
            performed_by INTEGER,
            old_value JSONB,
            new_value JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    `
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
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS tenant_monthly_dues (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            due_month DATE NOT NULL,
            due_date DATE NOT NULL,
            cycle_start_date DATE,
            cycle_end_date DATE,
            total_rent NUMERIC(12, 2) NOT NULL DEFAULT 0,
            paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            pending_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `,
    `
        ALTER TABLE tenant_monthly_dues
        ADD COLUMN IF NOT EXISTS cycle_start_date DATE
    `,
    `
        ALTER TABLE tenant_monthly_dues
        ADD COLUMN IF NOT EXISTS cycle_end_date DATE
    `,
    `
        CREATE INDEX IF NOT EXISTS tenant_documents_tenant_idx
        ON tenant_documents(tenant_id, document_type)
    `,
    `
        CREATE INDEX IF NOT EXISTS tenant_activity_logs_tenant_idx
        ON tenant_activity_logs(tenant_id, created_at DESC)
    `,
    `
        CREATE INDEX IF NOT EXISTS tenant_bed_history_tenant_idx
        ON tenant_bed_history(tenant_id, transferred_at DESC)
    `,
    `
        CREATE INDEX IF NOT EXISTS tenant_monthly_dues_tenant_idx
        ON tenant_monthly_dues(tenant_id, due_month DESC)
    `,
    `
        CREATE INDEX IF NOT EXISTS tenants_institution_status_idx
        ON tenants(institution_id, status)
    `,
    `
        CREATE INDEX IF NOT EXISTS tenant_payments_institution_date_idx
        ON tenant_payments(institution_id, payment_date)
    `,
    `
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
    `,
    `
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
    `,
    `
        INSERT INTO user_credentials (
            email,
            password,
            role,
            institution_id,
            super_admin_id
        )
        SELECT
            sa.email,
            sa.password,
            'super_admin',
            sa.institution_id,
            sa.id
        FROM super_admins sa
        WHERE sa.email IS NOT NULL
          AND sa.password IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM user_credentials uc
              WHERE uc.email = sa.email
          )
    `,
    `
        INSERT INTO user_credentials (
            email,
            password,
            role,
            institution_id,
            pg_admin_id
        )
        SELECT
            pa.email,
            pa.password,
            'pg_admin',
            pa.institution_id,
            pa.id
        FROM pg_admin pa
        WHERE pa.email IS NOT NULL
          AND pa.password IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM user_credentials uc
              WHERE uc.email = pa.email
          )
    `,
    `
        CREATE TABLE IF NOT EXISTS urmg_actions (
            action_id INTEGER PRIMARY KEY,
            action_name VARCHAR(50) NOT NULL UNIQUE,
            priority INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            inst_id INTEGER NOT NULL DEFAULT 1
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS urmg_menus (
            menu_id INTEGER PRIMARY KEY,
            parent_menu_id INTEGER,
            module_id INTEGER NOT NULL DEFAULT 1,
            menu_name VARCHAR(100) NOT NULL,
            priority INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            inst_id INTEGER NOT NULL DEFAULT 1
        )
    `,
    `
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
        )
    `,
    `
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
        )
    `,
    `
        DELETE FROM urmg_profile_menus_actions
        WHERE menu_id IN (5, 6, 7, 8, 9, 10, 11, 12, 13, 100, 101, 102, 103)
    `,
    `
        DELETE FROM urmg_menu_actions
        WHERE menu_id IN (5, 6, 7, 8, 9, 10, 11, 12, 13, 100, 101, 102, 103)
    `,
    `
        DELETE FROM urmg_menus
        WHERE menu_id IN (5, 6, 7, 8, 9, 10, 11, 12, 13, 100, 101, 102, 103)
    `,
    `
        INSERT INTO urmg_actions (
            action_id,
            action_name,
            priority,
            status,
            inst_id
        )
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
            inst_id = EXCLUDED.inst_id
    `,
    `
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
            (8, NULL, 1, 'TenantManagement', 4, 1, 1),
            (9, 8, 1, 'Tenant Onboarding', 1, 1, 1),
            (10, 8, 1, 'Active Tenants', 2, 1, 1),
            (11, 8, 1, 'Vacant Beds', 3, 1, 1),
            (12, 8, 1, 'Payments', 4, 1, 1),
            (13, 8, 1, 'Vacated History', 5, 1, 1),
            (14, 8, 1, 'Tenant History', 6, 1, 1),
            (100, NULL, 1, 'ExpenseManagement', 5, 1, 1),
            (101, 100, 1, 'Daily Expenses', 1, 1, 1)
        ON CONFLICT (menu_id) DO UPDATE SET
            parent_menu_id = EXCLUDED.parent_menu_id,
            module_id = EXCLUDED.module_id,
            menu_name = EXCLUDED.menu_name,
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `,
    `
        INSERT INTO urmg_menu_actions (
            menu_id,
            action_id,
            priority,
            status,
            inst_id
        )
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
            (9, 1, 1, 1, 1),
            (9, 2, 2, 1, 1),
            (9, 3, 3, 1, 1),
            (9, 4, 4, 1, 1),
            (9, 5, 5, 1, 1),
            (10, 2, 1, 1, 1),
            (10, 3, 2, 1, 1),
            (10, 5, 3, 1, 1),
            (11, 3, 1, 1, 1),
            (11, 5, 2, 1, 1),
            (12, 1, 1, 1, 1),
            (12, 3, 2, 1, 1),
            (12, 5, 3, 1, 1),
            (13, 3, 1, 1, 1),
            (13, 5, 2, 1, 1),
            (14, 3, 1, 1, 1),
            (14, 5, 2, 1, 1),
            (101, 1, 1, 1, 1),
            (101, 2, 2, 1, 1),
            (101, 3, 3, 1, 1),
            (101, 4, 4, 1, 1),
            (101, 5, 5, 1, 1)
        ON CONFLICT (menu_id, action_id) DO UPDATE SET
            priority = EXCLUDED.priority,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `,
    `
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
            (1, 9, 1, 2, 1, 1),
            (1, 9, 2, 2, 1, 1),
            (1, 9, 3, 2, 1, 1),
            (1, 9, 4, 2, 1, 1),
            (1, 9, 5, 2, 1, 1),
            (1, 10, 2, 2, 1, 1),
            (1, 10, 3, 2, 1, 1),
            (1, 10, 5, 2, 1, 1),
            (1, 11, 3, 2, 1, 1),
            (1, 11, 5, 2, 1, 1),
            (1, 12, 1, 2, 1, 1),
            (1, 12, 3, 2, 1, 1),
            (1, 12, 5, 2, 1, 1),
            (1, 13, 3, 2, 1, 1),
            (1, 13, 5, 2, 1, 1),
            (1, 14, 3, 2, 1, 1),
            (1, 14, 5, 2, 1, 1),
            (2, 9, 1, 2, 1, 1),
            (2, 9, 2, 2, 1, 1),
            (2, 9, 3, 2, 1, 1),
            (2, 9, 4, 2, 1, 1),
            (2, 9, 5, 2, 1, 1),
            (2, 10, 2, 2, 1, 1),
            (2, 10, 3, 2, 1, 1),
            (2, 10, 5, 2, 1, 1),
            (2, 11, 3, 2, 1, 1),
            (2, 11, 5, 2, 1, 1),
            (2, 14, 3, 2, 1, 1),
            (2, 14, 5, 2, 1, 1),
            (2, 12, 1, 2, 1, 1),
            (2, 12, 3, 2, 1, 1),
            (2, 12, 5, 2, 1, 1),
            (2, 13, 3, 2, 1, 1),
            (2, 13, 5, 2, 1, 1),
            (1, 101, 1, 2, 1, 1),
            (1, 101, 2, 2, 1, 1),
            (1, 101, 3, 2, 1, 1),
            (1, 101, 4, 2, 1, 1),
            (1, 101, 5, 2, 1, 1),
            (2, 101, 1, 2, 1, 1),
            (2, 101, 2, 2, 1, 1),
            (2, 101, 3, 2, 1, 1),
            (2, 101, 4, 2, 1, 1),
            (2, 101, 5, 2, 1, 1)
        ON CONFLICT (profile_id, menu_id, action_id) DO UPDATE SET
            is_configuration_only = EXCLUDED.is_configuration_only,
            status = EXCLUDED.status,
            inst_id = EXCLUDED.inst_id
    `,
];

const initDatabase = async () => {
    for (const statement of statements) {
        await pool.query(statement);
    }
};

module.exports = initDatabase;
