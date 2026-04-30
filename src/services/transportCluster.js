const { query }    = require('../config/db');
const { haversine } = require('../utils/geo');

const FARE_PER_KM    = 500;  // RWF per km
const CLUSTER_RADIUS = 2000; // 2 km pickup zone

/**
 * Group open transport requests for an event by proximity.
 * Uses Haversine distance — no PostGIS needed.
 */
const clusterRequests = async (eventId, entityType = 'event') => {
  const { rows: requests } = await query(`
    SELECT * FROM transport_requests
    WHERE event_or_activity_id = $1
      AND entity_type = $2
      AND status = 'open'
      AND matched_group_id IS NULL
  `, [eventId, entityType]);

  if (requests.length < 2) return [];

  const groups   = [];
  const assigned = new Set();

  for (const anchor of requests) {
    if (assigned.has(anchor.id)) continue;

    const anchorLat = parseFloat(anchor.from_lat);
    const anchorLon = parseFloat(anchor.from_lon);

    // Find all unassigned requests within cluster radius of this anchor
    const nearby = requests.filter((r) => {
      if (assigned.has(r.id)) return false;
      const dist = haversine(anchorLat, anchorLon, parseFloat(r.from_lat), parseFloat(r.from_lon));
      r._dist = dist;
      return dist <= CLUSTER_RADIUS;
    });

    if (nearby.length < 2) continue;

    const totalSeats   = nearby.reduce((s, r) => s + r.seats_needed, 0);
    const maxDistM     = Math.max(...nearby.map((r) => r._dist));
    const farePerSeat  = Math.ceil((maxDistM / 1000 * FARE_PER_KM) / Math.max(totalSeats, 1) / 100) * 100;

    // Create group record
    const { rows: [grp] } = await query(`
      INSERT INTO transport_groups (event_id, pickup_zone, total_seats, fare_per_seat, status)
      VALUES ($1, $2, $3, $4, 'open')
      RETURNING id
    `, [eventId, anchor.from_address, totalSeats, farePerSeat]);

    for (const r of nearby) {
      assigned.add(r.id);
      await query(
        "UPDATE transport_requests SET matched_group_id=$1, status='matched' WHERE id=$2",
        [grp.id, r.id]
      );
      await query(
        'INSERT INTO transport_group_members(group_id, user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [grp.id, r.requester_id]
      );
    }

    groups.push({ groupId: grp.id, members: nearby.length, farePerSeat });
  }

  return groups;
};

module.exports = { clusterRequests };