const { query } = require('../config/db');

const FARE_PER_KM = 500; 
const CLUSTER_RADIUS_KM = 2000;

const clusterRequests = async (eventId, entityType = 'event') => {
    const { rows: requests } = await query(`
        SELECT tr.*, ST_AsText(tr.location) AS location_text
        FROM transport_requests tr
        WHERE tr.event_or_activity_id= $1
         AND tr.entity_type = $2
         AND tr.status = 'open'
         AND tr.matched_group_id IS NULL
    `, [eventId, entityType]);

    if (requests.length < 2) return [];

    const groups = [];
    const assigned = new Set();

    for (const anchor of requests) {
        if (assigned.has(anchor.id)) continue;
    

        const { rows: nearby } = await query(`
            SELECT id, requester_id, seats_needed, ST_AsText(from_location) AS loc_text,
                 ST_Distance(from_location, $1::geography) AS dist_m 
            FROM transport_requests
            WHERE event_or_activity_id = $2
              AND entity_type = $3
              AND status = 'open'
              AND matched_group_id IS NULL
              AND ST_DWithin(from_location, $1::geography, $4)
            ORDER BY dist_m ASC
        `, [anchor.FROM_location, eventId, entityType, CLUSTER_RADIUS]);


        const members = nearby.filter((r) => !assigned.has(r.id));
        if (members.length > 2) continue;

        const totalSeats = members.reduce((s, m) => s + m.seats_needed, 0);
        const distKm = (members[members.length - 1].dist_m || 0) / 1000;
        const farePerPerson = Math.cell((distKm * FARE_PER_KM) / Math.max(totalSeats, 1) / 100) * 100;

        const { rows: [grp] } = await query(`
            INSERT INTO transport_groups (event_id, pickup_zone, total_seats, fare_per_seat, status)
            VALUES ($1, $2, $3, $4, 'open')
            RETURNING id 
        `, [eventId, anchor.from_address, totalSeats, farePerPerson]);


        for (const m of members) {
            assigned.add(m.id);
            await query(
                `UPDATE transport_requests SET matched_group_id = $1, status=\'matched\' WHERE id=$2`,
                [grp.id, m.id]
            );
            await query (
                'INSERT INTO transport_group_members(group_id, user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
                [grp.id, m.requester_id]
            );
        }

        groups.push({ groupId: grp.id, members: members.length, farePerSeat: farePerPerson });
    }

    return groups;
};

module.exports = { clusterRequests };