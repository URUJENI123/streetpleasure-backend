const { query } = require('../config/db');

// Static destination data seeded into DB; returned via API
const listDestinations = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT d.*,
             COUNT(DISTINCT e.id) AS upcoming_tours
      FROM destinations d
      LEFT JOIN events e ON e.category = d.slug
        AND e.status = 'published'
        AND e.start_time > NOW()
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    res.json({ destinations: rows });
  } catch (err) { next(err); }
};

const getDestination = async (req, res, next) => {
  try {
    const { rows: [dest] } = await query('SELECT * FROM destinations WHERE id=$1 OR slug=$1', [req.params.id]);
    if (!dest) return res.status(404).json({ error: 'Destination not found' });

    // Upcoming guided tours for this destination
    const { rows: tours } = await query(`
      SELECT e.*, u.full_name AS guide_name, u.rating_avg AS guide_rating,
             COUNT(ea.user_id) AS booked
      FROM events e
      JOIN users u ON u.id = e.host_id
      LEFT JOIN event_attendees ea ON ea.event_id = e.id
      WHERE e.category = $1 AND e.status = 'published' AND e.start_time > NOW()
      GROUP BY e.id, u.full_name, u.rating_avg
      ORDER BY e.start_time ASC
      LIMIT 20
    `, [dest.slug]);

    res.json({ destination: dest, tours });
  } catch (err) { next(err); }
};

module.exports = { listDestinations, getDestination };