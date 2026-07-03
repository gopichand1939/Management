CREATE TABLE IF NOT EXISTS weekly_food_menu_config (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    day_name VARCHAR(20) NOT NULL,
    day_order INTEGER NOT NULL,
    meal_type_id INTEGER NOT NULL REFERENCES meal_type_master(id) ON DELETE CASCADE,
    food_items TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP,
    CONSTRAINT weekly_food_menu_day_order_check
        CHECK (day_order BETWEEN 1 AND 7),
    CONSTRAINT weekly_food_menu_day_name_check
        CHECK (
            day_name IN (
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday'
            )
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_food_menu_unique_active_idx
ON weekly_food_menu_config(institution_id, day_order, meal_type_id)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS weekly_food_menu_institution_idx
ON weekly_food_menu_config(institution_id, day_order, meal_type_id);
