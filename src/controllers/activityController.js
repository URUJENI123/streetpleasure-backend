const { query }      = require('../config/db');
const { send }       = require('../services/fcm');
const { boundingBox, filterByRadius } = require('../utils/geo');
const { badReq, notFound, forbidden } = require('../utils/errors');

const listActivities = async (req, res, next) => {
  try {
    const { lat, lon, radius = 5000, type, limit = 20, offset = 0 } = req.query;
    if (!lat || !lon) return next(badReq('lat and lon required'));

    const cLat = parseFloat(lat);
    const cLon = parseFloat(lon);
    const bbox = boundingBox(cLat, cLon, parseInt(radius));

    let sql = `
      SELECT a.*, u.full_name AS creator_name, u.avatar_url AS creator_avatar,
             u.rating_avg AS creator_rating,
             COUNT(ap.user_id) AS participant_count
      FROM activities a
      JOIN users u ON u.id = a.creator_id
      LEFT JOIN activity_participants ap ON ap.activity_id = a.id
      WHERE a.status = 'open'
        AND a.scheduled_at > NOW()
        AND a.lat BETWEEN $1 AND $2
        AND a.lon BETWEEN $3 AND $4
    `;
    const params = [bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon];
    let idx = 5;

    if (type) { sql += ` AND a.activity_type = $${idx++}`; params.push(type); }
    sql += ` GROUP BY a.id, u.full_name, u.avatar_url, u.rating_avg`;

    const { rows: raw } = await query(sql, params);

    // Precise Haversine filter + sort
    const filtered = filterByRadius(raw, cLat, cLon, parseInt(radius))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({ activities: filtered });
  } catch (err) { next(err); }
};

const getActivity = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT a.*, u.full_name AS creator_name, u.avatar_url AS creator_avatar,
             json_agg(json_build_object(
               'user_id',    ap.user_id,
               'name',       pu.full_name,
               'avatar',     pu.avatar_url,
               'rating',     pu.rating_avg,
               'checked_in', ap.checked_in
             )) FILTER (WHERE ap.user_id IS NOT NULL) AS participants
      FROM activities a
      JOIN users u ON u.id = a.creator_id
      LEFT JOIN activity_participants ap ON ap.activity_id = a.id
      LEFT JOIN users pu ON pu.id = ap.user_id
      WHERE a.id = $1
      GROUP BY a.id, u.full_name, u.avatar_url
    `, [req.params.id]);

    if (!rows.length) return next(notFound('Activity not found'));
    res.json({ activity: rows[0] });
  } catch (err) { next(err); }
};

const createActivity = async (req, res, next) => {
  try {
    const { title, description, activity_type, lat, lon, address_text, scheduled_at, max_participants = 6 } = req.body;

    const { rows } = await query(`
      INSERT INTO activities
        (creator_id, title, description, activity_type, lat, lon, address_text, scheduled_at, max_participants)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [req.user.id, title, description, activity_type,
        parseFloat(lat), parseFloat(lon), address_text, scheduled_at, parseInt(max_participants)]);

    const activity = rows[0];
    await query(
      'INSERT INTO activity_participants(activity_id, user_id) VALUES($1,$2)',
      [activity.id, req.user.id]
    );

    res.status(201).json({ activity });
  } catch (err) { next(err); }
};

const joinActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM activities WHERE id=$1', [id]);
    if (!rows.length) return next(notFound('Activity not found'));
    const act = rows[0];

    if (act.status !== 'open') return next(badReq(`Activity is ${act.status}`));
    if (act.creator_id === req.user.id) return next(badReq('You created this activity'));

    const { rows: existing } = await query(
      'SELECT 1 FROM activity_participants WHERE activity_id=$1 AND user_id=$2', [id, req.user.id]
    );
    if (existing.length) return next(badReq('Already joined'));

    const { rows: [{ cnt }] } = await query(
      'SELECT COUNT(*) AS cnt FROM activity_participants WHERE activity_id=$1', [id]
    );
    if (parseInt(cnt) >= act.max_participants) return next(badReq('Activity is full'));

    await query(
      'INSERT INTO activity_participants(activity_id, user_id) VALUES($1,$2)', [id, req.user.id]
    );

    if (parseInt(cnt) + 1 >= act.max_participants) {
      await query("UPDATE activities SET status='full' WHERE id=$1", [id]);
    }

    // Create chat room when min 2 participants reached
    let chatId;
    const { rows: chat } = await query(
      "SELECT id FROM chats WHERE related_entity_type='activity' AND related_entity_id=$1", [id]
    );
    if (chat.length) {
      chatId = chat[0].id;
    } else if (parseInt(cnt) + 1 >= 2) {
      const expiresAt = new Date(new Date(act.scheduled_at).getTime() + 24 * 60 * 60 * 1000);
      const { rows: [c] } = await query(`
        INSERT INTO chats(related_entity_type, related_entity_id, expires_at)
        VALUES('activity',$1,$2) RETURNING id
      `, [id, expiresAt]);
      chatId = c.id;
    }

    // Notify creator
    const { rows: [creator] } = await query('SELECT fcm_token FROM users WHERE id=$1', [act.creator_id]);
    const { rows: [joiner] }  = await query('SELECT full_name FROM users WHERE id=$1', [req.user.id]);
    if (creator?.fcm_token) {
      await send({
        token: creator.fcm_token,
        title: 'Someone joined your activity!',
        body:  `${joiner?.full_name || 'A user'} joined "${act.title}"`,
        data:  { activityId: id, type: 'join' },
      });
    }

    res.json({ message: 'Joined', chatId });
  } catch (err) { next(err); }
};

const leaveActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT creator_id FROM activities WHERE id=$1', [id]);
    if (!rows.length) return next(notFound());
    if (rows[0].creator_id === req.user.id) return next(badReq('Creator cannot leave — cancel instead'));

    await query('DELETE FROM activity_participants WHERE activity_id=$1 AND user_id=$2', [id, req.user.id]);
    await query("UPDATE activities SET status='open' WHERE id=$1 AND status='full'", [id]);
    res.json({ message: 'Left activity' });
  } catch (err) { next(err); }
};

const checkinParticipant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const { rows } = await query('SELECT creator_id FROM activities WHERE id=$1', [id]);
    if (!rows.length) return next(notFound());
    if (rows[0].creator_id !== req.user.id) return next(forbidden());

    await query(
      'UPDATE activity_participants SET checked_in=TRUE WHERE activity_id=$1 AND user_id=$2', [id, user_id]
    );
    res.json({ message: 'Checked in' });
  } catch (err) { next(err); }
};

const rateParticipants = async (req, res, next) => {
  try {
    const { id }      = req.params;
    const { ratings } = req.body;

    const { rows } = await query(
      'SELECT 1 FROM activity_participants WHERE activity_id=$1 AND user_id=$2', [id, req.user.id]
    );
    if (!rows.length) return next(forbidden('Not a participant'));

    for (const { user_id, rating } of ratings) {
      if (user_id === req.user.id || rating < 1 || rating > 5) continue;
      await query(
        'UPDATE activity_participants SET rating_given=$1 WHERE activity_id=$2 AND user_id=$3',
        [rating, id, user_id]
      );
      await query(`
        UPDATE users SET
          total_ratings = total_ratings + 1,
          rating_avg    = ((rating_avg * total_ratings) + $1) / (total_ratings + 1)
        WHERE id = $2
      `, [rating, user_id]);
    }
    res.json({ message: 'Ratings submitted' });
  } catch (err) { next(err); }
};

const cancelActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT creator_id FROM activities WHERE id=$1', [id]);
    if (!rows.length) return next(notFound());
    if (rows[0].creator_id !== req.user.id && req.user.role !== 'admin') return next(forbidden());

    await query("UPDATE activities SET status='cancelled' WHERE id=$1", [id]);
    res.json({ message: 'Activity cancelled' });
  } catch (err) { next(err); }
};

module.exports = {
  listActivities, getActivity, createActivity, joinActivity,
  leaveActivity, checkinParticipant, rateParticipants, cancelActivity,
};