const pool = require("../Config/Database");

const institutionSelectQuery = `
    SELECT
        institutions.*,
        COALESCE((
            SELECT COUNT(*)
            FROM floors
            WHERE floors.institution_id = institutions.id
        ), 0)::INTEGER AS total_floors,
        COALESCE((
            SELECT COUNT(*)
            FROM rooms
            WHERE rooms.institution_id = institutions.id
        ), 0)::INTEGER AS total_rooms,
        COALESCE((
            SELECT COUNT(*)
            FROM beds
            WHERE beds.institution_id = institutions.id
        ), 0)::INTEGER AS total_beds,
        COALESCE((
            SELECT COUNT(*)
            FROM beds
            WHERE beds.institution_id = institutions.id
              AND LOWER(COALESCE(beds.status, 'vacant')) = 'occupied'
        ), 0)::INTEGER AS occupied_beds,
        COALESCE((
            SELECT COUNT(*)
            FROM beds
            WHERE beds.institution_id = institutions.id
              AND LOWER(COALESCE(beds.status, 'vacant')) = 'vacant'
        ), 0)::INTEGER AS vacant_beds
    FROM institutions
`;

const reconcileInstitutionBedOccupancy = async (institutionId = null) => {
    const values = [];
    const bedScope = ["status <> 'maintenance'"];
    const tenantScope = [
        "deleted_at IS NULL",
        "bed_id IS NOT NULL",
        "status <> 'vacated'",
    ];

    if (institutionId) {
        values.push(institutionId);
        bedScope.push(`institution_id = $${values.length}`);
        tenantScope.push(`institution_id = $${values.length}`);
    }

    await pool.query(`
        UPDATE beds
        SET status = 'vacant'
        WHERE ${bedScope.join(" AND ")}
    `, values);

    await pool.query(`
        UPDATE beds
        SET status = tenant_bed_status.next_status
        FROM (
            SELECT
                tenants.bed_id,
                CASE
                    WHEN tenants.status IN ('draft') THEN 'reserved'
                    WHEN tenants.status IN (
                        'pending_verification',
                        'active',
                        'notice_period'
                    )
                        THEN 'occupied'
                    ELSE 'vacant'
                END AS next_status
            FROM tenants
            WHERE ${tenantScope.join(" AND ")}
        ) AS tenant_bed_status
        WHERE beds.id = tenant_bed_status.bed_id
          AND beds.status <> 'maintenance'
    `, values);

    await pool.query(`
        UPDATE rooms
        SET
            occupied_beds = room_stats.occupied_beds,
            vacant_beds = room_stats.vacant_beds
        FROM (
            SELECT
                rooms.id AS room_id,
                COUNT(beds.id) FILTER (WHERE beds.status = 'occupied') AS occupied_beds,
                COUNT(beds.id) FILTER (WHERE beds.status = 'vacant') AS vacant_beds
            FROM rooms
            LEFT JOIN beds
                ON beds.room_id = rooms.id
            ${institutionId ? "WHERE rooms.institution_id = $1" : ""}
            GROUP BY rooms.id
        ) AS room_stats
        WHERE rooms.id = room_stats.room_id
    `, institutionId ? [institutionId] : []);

    await pool.query(`
        UPDATE floors
        SET
            total_rooms = floor_stats.total_rooms,
            total_beds = floor_stats.total_beds,
            occupied_beds = floor_stats.occupied_beds,
            vacant_beds = floor_stats.vacant_beds
        FROM (
            SELECT
                floors.id AS floor_id,
                COUNT(DISTINCT rooms.id) AS total_rooms,
                COUNT(DISTINCT beds.id) AS total_beds,
                COUNT(DISTINCT beds.id) FILTER (WHERE beds.status = 'occupied') AS occupied_beds,
                COUNT(DISTINCT beds.id) FILTER (WHERE beds.status = 'vacant') AS vacant_beds
            FROM floors
            LEFT JOIN rooms
                ON rooms.floor_id = floors.id
            LEFT JOIN beds
                ON beds.room_id = rooms.id
            ${institutionId ? "WHERE floors.institution_id = $1" : ""}
            GROUP BY floors.id
        ) AS floor_stats
        WHERE floors.id = floor_stats.floor_id
    `, institutionId ? [institutionId] : []);
};

const mapInstitutionValues = (data) => {
    return [
        data.institution_name,
        data.institution_code || null,
        data.institution_type || null,
        data.email || null,
        data.phone || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.pincode || null,
        data.manager_name || null,
        data.manager_phone || null,
        data.logo || null,
        data.status || "active",
        data.created_by || null,
    ];
};

const buildInstitutionHierarchy = (institution, floors) => {
    return {
        ...institution,
        floors,
        total_floors: floors.length,
        total_rooms: floors.reduce((total, floor) => {
            return total + floor.rooms.length;
        }, 0),
        total_beds: floors.reduce((total, floor) => {
            return total + floor.rooms.reduce((roomTotal, room) => {
                return roomTotal + room.beds.length;
            }, 0);
        }, 0),
    };
};

const insertInstitutionHierarchy = async (client, institutionId, floors) => {
    const createdFloors = [];

    for (const floor of floors || []) {
        const floorResult = await client.query(`
            INSERT INTO floors (
                institution_id,
                floor_name,
                floor_number,
                gender_type,
                status
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            institutionId,
            floor.floor_name,
            floor.floor_number,
            floor.gender_type || null,
            floor.status || "active",
        ]);

        const createdFloor = floorResult.rows[0];
        const createdRooms = [];

        for (const room of floor.rooms || []) {
            const roomResult = await client.query(`
                INSERT INTO rooms (
                    institution_id,
                    floor_id,
                    room_number,
                    room_type,
                    capacity,
                    rent_amount,
                    attached_bathroom,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                institutionId,
                createdFloor.id,
                room.room_number,
                room.room_type || null,
                room.capacity || null,
                room.rent_amount || null,
                room.attached_bathroom || false,
                room.status || "active",
            ]);

            const createdRoom = roomResult.rows[0];
            const createdBeds = [];

            for (const bed of room.beds || []) {
                const bedResult = await client.query(`
                    INSERT INTO beds (
                        institution_id,
                        floor_id,
                        room_id,
                        bed_number,
                        bed_type,
                        rent_override,
                        status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `, [
                    institutionId,
                    createdFloor.id,
                    createdRoom.id,
                    bed.bed_number,
                    bed.bed_type || null,
                    bed.rent_override || null,
                    bed.status || "vacant",
                ]);

                createdBeds.push(bedResult.rows[0]);
            }

            createdRooms.push({
                ...createdRoom,
                beds: createdBeds,
            });
        }

        createdFloors.push({
            ...createdFloor,
            rooms: createdRooms,
        });
    }

    return createdFloors;
};

const createInstitution = async (data) => {
    const query = `
        INSERT INTO institutions (
            institution_name,
            institution_code,
            institution_type,
            email,
            phone,
            address,
            city,
            state,
            pincode,
            manager_name,
            manager_phone,
            logo,
            status,
            created_by
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING *
    `;

    const result = await pool.query(query, mapInstitutionValues(data));

    return result.rows[0];
};

const createInstitutionOnboarding = async (data) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const institutionResult = await client.query(`
            INSERT INTO institutions (
                institution_name,
                institution_code,
                institution_type,
                email,
                phone,
                address,
                city,
                state,
                pincode,
                manager_name,
                manager_phone,
                logo,
                status,
                created_by
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12, $13, $14
            )
            RETURNING *
        `, mapInstitutionValues(data));

        const institution = institutionResult.rows[0];
        const createdFloors = await insertInstitutionHierarchy(
            client,
            institution.id,
            data.floors
        );

        await client.query("COMMIT");

        return buildInstitutionHierarchy(institution, createdFloors);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const getInstitutionList = async () => {
    await reconcileInstitutionBedOccupancy();

    const query = `${institutionSelectQuery} ORDER BY institutions.id DESC`;

    const result = await pool.query(query);

    return result.rows;
};

const findInstitutionById = async (id) => {
    await reconcileInstitutionBedOccupancy(id);

    const query = `${institutionSelectQuery} WHERE institutions.id = $1`;

    const values = [id];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const getInstitutionHierarchyById = async (id) => {
    await reconcileInstitutionBedOccupancy(id);

    const institution = await findInstitutionById(id);

    if (!institution) {
        return null;
    }

    const floorsResult = await pool.query(`
        SELECT *
        FROM floors
        WHERE institution_id = $1
        ORDER BY floor_number ASC, id ASC
    `, [id]);

    const roomsResult = await pool.query(`
        SELECT *
        FROM rooms
        WHERE institution_id = $1
        ORDER BY floor_id ASC, room_number ASC, id ASC
    `, [id]);

    const bedsResult = await pool.query(`
        SELECT *
        FROM beds
        WHERE institution_id = $1
        ORDER BY floor_id ASC, room_id ASC, bed_number ASC, id ASC
    `, [id]);

    const bedsByRoomId = bedsResult.rows.reduce((result, bed) => {
        if (!result.has(bed.room_id)) {
            result.set(bed.room_id, []);
        }

        result.get(bed.room_id).push(bed);

        return result;
    }, new Map());

    const roomsByFloorId = roomsResult.rows.reduce((result, room) => {
        if (!result.has(room.floor_id)) {
            result.set(room.floor_id, []);
        }

        result.get(room.floor_id).push({
            ...room,
            beds: bedsByRoomId.get(room.id) || [],
        });

        return result;
    }, new Map());

    return {
        ...institution,
        floors: floorsResult.rows.map((floor) => ({
            ...floor,
            rooms: roomsByFloorId.get(floor.id) || [],
        })),
    };
};

const updateInstitution = async (data) => {
    const query = `
        UPDATE institutions
        SET
            institution_name = $1,
            institution_code = $2,
            institution_type = $3,
            email = $4,
            phone = $5,
            address = $6,
            city = $7,
            state = $8,
            pincode = $9,
            manager_name = $10,
            manager_phone = $11,
            logo = $12,
            status = $13
        WHERE id = $14
        RETURNING *
    `;

    const values = [
        ...mapInstitutionValues(data).slice(0, 13),
        data.id,
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const updateInstitutionOnboarding = async (data) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const institutionResult = await client.query(`
            UPDATE institutions
            SET
                institution_name = $1,
                institution_code = $2,
                institution_type = $3,
                email = $4,
                phone = $5,
                address = $6,
                city = $7,
                state = $8,
                pincode = $9,
                manager_name = $10,
                manager_phone = $11,
                logo = $12,
                status = $13
            WHERE id = $14
            RETURNING *
        `, [
            ...mapInstitutionValues(data).slice(0, 13),
            data.id,
        ]);

        const institution = institutionResult.rows[0];

        await client.query(`
            DELETE FROM floors
            WHERE institution_id = $1
        `, [data.id]);

        const createdFloors = await insertInstitutionHierarchy(
            client,
            data.id,
            data.floors
        );

        await client.query("COMMIT");

        return buildInstitutionHierarchy(institution, createdFloors);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const deleteInstitutionById = async (id) => {
    const query = `
        DELETE FROM institutions
        WHERE id = $1
        RETURNING *
    `;

    const values = [id];

    const result = await pool.query(query, values);

    return result.rows[0];
};

module.exports = {
    createInstitution,
    createInstitutionOnboarding,
    deleteInstitutionById,
    findInstitutionById,
    getInstitutionHierarchyById,
    getInstitutionList,
    updateInstitution,
    updateInstitutionOnboarding,
};
