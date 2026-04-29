const { query } = require('../config/db');
const { notFound } = require('../utils/errors');

const getMe = async (req, res, next) => {
  try {
    const { rows: [user] } = await query(`
      SELECT id, phone_number, role, full_name, bio, avatar_url,
             rating_avg, total_ratings, id_verified_at, created_at
      FROM users WHERE id=$1
    `, [req.user.id]);
    if (!user) return next(notFound());
    res.json({ user });
  } catch (err) { next(err); }
};

const updateMe = async (req, res, next) => {
  try {
    const { full_name, bio, fcm_token } = req.body;
    const avatar_url = req.file?.location;

    const fields  = [];
    const params  = [];
    let idx = 1;

    if (full_name !== undefined) { fields.push(`full_name=$${idx++}`); params.push(full_name); }
    if (bio !== undefined)       { fields.push(`bio=$${idx++}`);       params.push(bio); }
    if (fcm_token !== undefined) { fields.push(`fcm_token=$${idx++}`); params.push(fcm_token); }
    if (avatar_url)              { fields.push(`avatar_url=$${idx++}`); params.push(avatar_url); }

    if (!fields.length) return res.json({ message: 'Nothing to update' });

    fields.push(`updated_at=NOW()`);
    params.push(req.user.id);

    const { rows: [user] } = await query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx} RETURNING id, full_name, bio, avatar_url, fcm_token, role`,
      params
    );
    res.json({ user });
  } catch (err) { next(err); }
};

const getUser = async (req, res, next) => {
  try {
    const { rows: [user] } = await query(`
      SELECT id, full_name, bio, avatar_url, role, rating_avg, total_ratings, id_verified_at
      FROM users WHERE id=$1
    `, [req.params.id]);
    if (!user) return next(notFound('User not found'));
    res.json({ user });
  } catch (err) { next(err); }
};

module.exports = { getMe, updateMe, getUser };
