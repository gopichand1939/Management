CREATE TABLE IF NOT EXISTS payment_reminder_actions (
    id SERIAL PRIMARY KEY,
    monthly_due_id INTEGER NOT NULL REFERENCES tenant_monthly_dues(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL DEFAULT 'follow_up',
    action_note TEXT,
    promise_date DATE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS payment_reminder_actions_due_idx
ON payment_reminder_actions(monthly_due_id, created_at DESC);
