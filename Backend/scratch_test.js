const { Pool } = require('pg');
const url1 = "postgresql://neondb_owner:npg_w78BXnzdpQaT@ep-restless-sky-adxhmb6k-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function main() {
  const pool = new Pool({
    connectionString: url1,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const joinRes = await pool.query(`
      SELECT
          ri.id,
          ri.item_name,
          ri.created_by,
          uc.id as uc_id,
          uc.email as created_by_email,
          uc.role as uc_role,
          uc.pg_admin_id as uc_pg_admin_id,
          uc.super_admin_id as uc_super_admin_id
      FROM ration_items ri
      LEFT JOIN user_credentials uc ON (
          (uc.role = 'pg_admin' AND uc.pg_admin_id = ri.created_by AND uc.institution_id = ri.institution_id)
          OR
          (uc.role = 'super_admin' AND uc.super_admin_id = ri.created_by AND NOT EXISTS (
              SELECT 1 FROM user_credentials uc2 
              WHERE uc2.role = 'pg_admin' 
                AND uc2.pg_admin_id = ri.created_by 
                AND uc2.institution_id = ri.institution_id
          ))
      )
      WHERE ri.id IN (30, 31)
    `);
    console.log("=== IMPROVED JOIN RESULT ===");
    console.table(joinRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
