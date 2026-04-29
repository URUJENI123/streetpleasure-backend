const { query }  = require('../config/db');
const { clusterRequests } = require('../services/transportCluster');
const { requestPayment }  = require('../services/momo');
const { badReq, notFound } = require('../utils/errors');

const requestTransport = async (req, res, next) => {
  try {
    const { event_or_activity_id, entity_type, lat, lon, from_address, seats_needed = 1 } = req.body;

    // Check no duplicate
    const { rows: dup } = await query(
      'SELECT 1 FROM transport_requests WHERE event_or_activity_id=$1 AND requester_id=$2',
      [event_or_activity_id, req.user.id]
    );
    if (dup.length) return next(badReq('Already requested transport for this event'));

    const { rows: [tr] } = await query(`
      INSERT INTO transport_requests
        (event_or_activity_id, entity_type, requester_id, from_location, from_address, seats_needed)
      VALUES ($1,$2,$3, ST_MakePoint($4,$5)::geography, $6,$7)
      RETURNING *
    `, [event_or_activity_id, entity_type, req.user.id,
        parseFloat(lon), parseFloat(lat), from_address, parseInt(seats_needed)]);

    // Try to auto-cluster after each new request
    const groups = await clusterRequests(event_or_activity_id, entity_type);

    res.status(201).json({ request: tr, groupsFormed: groups.length, groups });
  } catch (err) { next(err); }
};

const getTransportGroups = async (req, res, next) => {
  try {
    const { event_id } = req.query;
    if (!event_id) return next(badReq('event_id required'));

    const { rows } = await query(`
      SELECT tg.*,
             json_agg(json_build_object(
               'user_id', tgm.user_id,
               'name',    u.full_name,
               'avatar',  u.avatar_url
             )) FILTER (WHERE tgm.user_id IS NOT NULL) AS members
      FROM transport_groups tg
      LEFT JOIN transport_group_members tgm ON tgm.group_id = tg.id
      LEFT JOIN users u ON u.id = tgm.user_id
      WHERE tg.event_id = $1
      GROUP BY tg.id
      ORDER BY tg.created_at ASC
    `, [event_id]);

    res.json({ groups: rows });
  } catch (err) { next(err); }
};

const joinTransportGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone_number } = req.body;

    const { rows: [grp] } = await query('SELECT * FROM transport_groups WHERE id=$1', [id]);
    if (!grp) return next(notFound('Transport group not found'));
    if (grp.status !== 'open') return next(badReq('Group is no longer accepting members'));

    // Check already a member
    const { rows: existing } = await query(
      'SELECT 1 FROM transport_group_members WHERE group_id=$1 AND user_id=$2', [id, req.user.id]
    );
    if (existing.length) return next(badReq('Already in this group'));

    let paymentRef = null;
    if (grp.fare_per_seat > 0 && phone_number) {
      const { referenceId } = await requestPayment({
        amount:      grp.fare_per_seat,
        phoneNumber: phone_number,
        paymentNote: 'Twikoranire shared transport',
        externalId:  `transport-${id}-${req.user.id}`,
      });

      const { rows: [pmt] } = await query(`
        INSERT INTO payments(user_id, amount, currency, method, status, provider_ref)
        VALUES($1,$2,'RWF','momo','pending',$3) RETURNING id
      `, [req.user.id, grp.fare_per_seat, referenceId]);

      await query(
        'INSERT INTO transport_group_members(group_id, user_id, payment_id) VALUES($1,$2,$3)',
        [id, req.user.id, pmt.id]
      );
      paymentRef = referenceId;
    } else {
      await query(
        'INSERT INTO transport_group_members(group_id, user_id) VALUES($1,$2)', [id, req.user.id]
      );
    }

    res.json({ message: 'Joined transport group', farePerSeat: grp.fare_per_seat, paymentRef });
  } catch (err) { next(err); }
};

module.exports = { requestTransport, getTransportGroups, joinTransportGroup };