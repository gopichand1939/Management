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
        WHERE menu_id IN (5, 6, 7, 100, 101, 102, 103)
    `,
    `
        DELETE FROM urmg_menu_actions
        WHERE menu_id IN (5, 6, 7, 100, 101, 102, 103)
    `,
    `
        DELETE FROM urmg_menus
        WHERE menu_id IN (5, 6, 7, 100, 101, 102, 103)
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
            (7, 6, 1, 'Institution Availability', 3, 1, 1)
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
            (4, 5, 5, 1, 1)
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
            (2, 4, 5, 2, 1, 1)
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
