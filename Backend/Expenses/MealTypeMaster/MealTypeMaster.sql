CREATE TABLE IF NOT EXISTS meal_type_master (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    meal_type_name VARCHAR(100) NOT NULL,
    meal_type_code VARCHAR(50) NOT NULL,
    display_order INTEGER NOT NULL,
    start_time TIME,
    end_time TIME,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS meal_type_master_name_unique
ON meal_type_master(institution_id, LOWER(meal_type_name))
WHERE is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS meal_type_master_code_unique
ON meal_type_master(institution_id, meal_type_code)
WHERE is_deleted = false;

INSERT INTO meal_type_master (
    institution_id,
    meal_type_name,
    meal_type_code,
    display_order,
    start_time,
    end_time,
    description,
    is_active,
    is_deleted
)
SELECT
    institutions.id,
    seed_data.meal_type_name,
    seed_data.meal_type_code,
    seed_data.display_order,
    seed_data.start_time,
    seed_data.end_time,
    seed_data.description,
    true,
    false
FROM institutions
CROSS JOIN (
    VALUES
        ('Breakfast', 'BREAKFAST', 1, '07:00'::time, '09:30'::time, 'Recommended default breakfast slot'),
        ('Lunch', 'LUNCH', 2, '12:00'::time, '15:00'::time, 'Recommended default lunch slot'),
        ('Dinner', 'DINNER', 3, '19:00'::time, '22:00'::time, 'Recommended default dinner slot')
) AS seed_data(
    meal_type_name,
    meal_type_code,
    display_order,
    start_time,
    end_time,
    description
)
WHERE NOT EXISTS (
    SELECT 1
    FROM meal_type_master existing_meal_type
    WHERE existing_meal_type.institution_id = institutions.id
      AND existing_meal_type.is_deleted = false
      AND LOWER(existing_meal_type.meal_type_name) = LOWER(seed_data.meal_type_name)
);
