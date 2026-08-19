-- Create Daily Meal Tracker Table
CREATE TABLE IF NOT EXISTS daily_meal_tracker (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    breakfast VARCHAR(20) DEFAULT 'taking' CHECK (breakfast IN ('taking', 'skipping')),
    lunch VARCHAR(20) DEFAULT 'taking' CHECK (lunch IN ('taking', 'skipping')),
    dinner VARCHAR(20) DEFAULT 'taking' CHECK (dinner IN ('taking', 'skipping')),
    full_day_leave BOOLEAN DEFAULT FALSE,
    vacation BOOLEAN DEFAULT FALSE,
    reason TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT daily_meal_tracker_tenant_date_unique UNIQUE (tenant_id, meal_date)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS daily_meal_tracker_date_idx ON daily_meal_tracker(meal_date);
CREATE INDEX IF NOT EXISTS daily_meal_tracker_tenant_idx ON daily_meal_tracker(tenant_id);
CREATE INDEX IF NOT EXISTS daily_meal_tracker_institution_idx ON daily_meal_tracker(institution_id);
