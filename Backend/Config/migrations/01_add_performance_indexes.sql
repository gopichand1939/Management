-- Missing performance indexes for frequently filtered/joined columns to optimize backend queries
CREATE INDEX IF NOT EXISTS idx_beds_institution_status ON beds(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_tenants_expected_checkout ON tenants(expected_checkout_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_monthly_dues_status_due_date ON tenant_monthly_dues(status, due_date);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_status_verification ON tenant_payments(status, verification_status);
CREATE INDEX IF NOT EXISTS idx_inventory_management_institution_is_deleted ON inventory_management(institution_id, is_deleted);
