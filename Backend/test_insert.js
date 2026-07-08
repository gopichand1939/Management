const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_w78BXnzdpQaT@ep-restless-sky-adxhmb6k-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";

async function main() {
    const client = new Client({ connectionString });
    await client.connect();
    console.log("Connected to DB!");

    try {
        await client.query("BEGIN");

        // Let's get a valid bed, room, floor, institution
        const bedRes = await client.query("SELECT * FROM beds WHERE status = 'vacant' LIMIT 1");
        const bed = bedRes.rows[0];
        if (!bed) {
            throw new Error("No vacant bed found to test insert!");
        }
        console.log("Found vacant bed ID:", bed.id);

        // We insert a tenant with mock data matching the frontend onboarding wizard
        const query = `
            INSERT INTO tenants (
                institution_id,
                floor_id,
                room_id,
                bed_id,
                admission_number,
                full_name,
                phone,
                email,
                gender,
                date_of_birth,
                occupation,
                company_name,
                address,
                city,
                state,
                pincode,
                check_in_date,
                expected_checkout_date,
                guardian_name,
                guardian_phone,
                guardian_relation,
                emergency_contact_name,
                emergency_contact_phone,
                documents,
                profile_photo,
                aadhaar_number,
                notes,
                status,
                security_deposit,
                deposit_paid,
                refundable_amount,
                deposit_refund_status,
                billing_cycle_type,
                billing_cycle_anchor_day,
                first_cycle_start_date,
                first_cycle_end_date,
                first_cycle_amount,
                agreed_monthly_rent,
                created_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24::jsonb, $25::jsonb, $26, $27, $28, $29,
                $30, $31, $32, $33, $34, $35, $36, $37, $38, $39
            )
            RETURNING *
        `;

        const values = [
            bed.institution_id,
            bed.floor_id,
            bed.room_id,
            bed.id,
            'TEST-12345',
            'Test Tenant',
            '9876543210',
            'test@example.com',
            'male',
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            '2026-07-08',
            null,
            'Guardian',
            '9876543211',
            'father',
            null,
            null,
            '[]',
            'null',
            null,
            null,
            'active',
            0,
            0,
            0,
            'pending',
            'anniversary',
            8,
            null,
            null,
            0,
            0,
            null
        ];

        console.log("Running INSERT query...");
        const result = await client.query(query, values);
        console.log("INSERT completed successfully! ID:", result.rows[0].id);

        await client.query("ROLLBACK");
    } catch (err) {
        console.error("ERROR CAUGHT!");
        console.error("Message:", err.message);
        console.error("Table:", err.table);
        console.log("Full error detail:", err);
        await client.query("ROLLBACK");
    } finally {
        await client.end();
    }
}

main().catch(console.error);
