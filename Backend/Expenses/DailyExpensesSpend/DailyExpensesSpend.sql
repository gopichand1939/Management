CREATE TABLE IF NOT EXISTS daily_expenses_spend (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    expense_title VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    expense_time TIME,
    bill_file JSONB,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    updated_at TIMESTAMP
);

ALTER TABLE daily_expenses_spend
ADD COLUMN IF NOT EXISTS expense_time TIME;

ALTER TABLE daily_expenses_spend
ADD COLUMN IF NOT EXISTS bill_file JSONB;

ALTER TABLE daily_expenses_spend
ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS daily_expenses_spend_institution_date_idx
ON daily_expenses_spend(institution_id, expense_date DESC, expense_time DESC)
WHERE is_deleted = false;
