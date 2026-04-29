const { query }  = require('../config/db');
const { generatePolicePDF, emailToRNP } = require('../services/pdfPolice');
const { send }   = require('../services/fcm');
const { badReq, notFound, forbidden } = require('../utils/errors');

const LOCK_THRESHOLD = parseInt(process.env.REPORT_LOCK_THRESHOLD || '2');
const LOCK_WINDOW    = parseInt(process.env.REPORT_LOCK_WINDOW_DAYS || '7');

const submitReport = async (req, res, next) => {
  try {
    const { reported_user_id, entity_type, entity_id, reason, description } = req.body;

    if (reported_user_id === req.user.id) {
      return next(badReq('Cannot report yourself'));
    }

    // Check reported user exists
    const { rows: [target] } = await query(
      'SELECT id, full_name FROM users WHERE id=$1', [reported_user_id]
    );
    if (!target) return next(notFound('Reported user not found'));

    // Prevent duplicate report from same reporter in same window
    const { rows: dup } = await query(`
      SELECT 1 FROM reports
 WHERE reporter_id=$1 AND reported_user_id=$2 AND entity_id=$3
        AND created_at > NOW() - INTERVAL '${LOCK_WINDOW} days'
    `, [req.user.id, reported_user_id, entity_id]);
    if (dup.length) return next(badReq('You already reported this incident'));

    const { rows: [rpt] } = await query(`
      INSERT INTO reports(reporter_id, reported_user_id, entity_type, entity_id, reason, description)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *
    `, [req.user.id, reported_user_id, entity_type, entity_id, reason, description]);

    // Count distinct reporters in window → auto-lock if threshold met
    const { rows: [{ cnt }] } = await query(`
      SELECT COUNT(DISTINCT reporter_id) AS cnt
      FROM reports
      WHERE reported_user_id=$1
        AND created_at > NOW() - INTERVAL '${LOCK_WINDOW} days'
        AND status = 'pending'
    `, [reported_user_id]);

    let autoLocked = false;
    if (parseInt(cnt) >= LOCK_THRESHOLD) {
      await query(
        "UPDATE users SET locked_at=NOW(), lock_reason='Auto-locked: multiple reports' WHERE id=$1",
        [reported_user_id]
      );
      autoLocked = true;

      // Notify admins (query admin FCM tokens)
      const { rows: admins } = await query(
        "SELECT fcm_token FROM users WHERE role='admin' AND fcm_token IS NOT NULL"
      );
      for (const a of admins) {
        await send({
          token: a.fcm_token,
  title: 'User auto-locked',
          body:  `${target.full_name || reported_user_id} locked after ${cnt} reports`,
          data:  { reportId: rpt.id, type: 'auto_lock' },
        });
      }
    }

    res.status(201).json({ report: rpt, autoLocked });
  } catch (err) { next(err); }
};

const getMyReports = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT r.*, u.full_name AS reported_name
      FROM reports r
      JOIN users u ON u.id = r.reported_user_id
      WHERE r.reporter_id = $1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json({ reports: rows });
  } catch (err) { next(err); }
};

const generatePolicePacket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: [rpt] } = await query('SELECT * FROM reports WHERE id=$1', [id]);
    if (!rpt) return next(notFound('Report not found'));

    // Only reporter or admin can generate
    if (rpt.reporter_id !== req.user.id && req.user.role !== 'admin') {
      return next(forbidden());
    }

    const url = await generatePolicePDF(id);
    res.json({ url });
  } catch (err) { next(err); }
};

const sendToPolice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: [rpt] } = await query('SELECT * FROM reports WHERE id=$1', [id]);
    if (!rpt) return next(notFound());
    if (rpt.reporter_id !== req.user.id && req.user.role !== 'admin') return next(forbidden());

    let url = rpt.police_packet_url;
    if (!url) url = await generatePolicePDF(id);

    await emailToRNP(id, url);
    res.json({ message: 'Report sent to Rwanda National Police', url });
  } catch (err) { next(err); }
};

// Admin only
const resolveReport = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { status, admin_note, unlock_user } = req.body;

    await query(
      'UPDATE reports SET status=$1, admin_note=$2 WHERE id=$3',
      [status, admin_note, id]
    );

    if (unlock_user) {
      const { rows: [rpt] } = await query('SELECT reported_user_id FROM reports WHERE id=$1', [id]);
      if (rpt) await query('UPDATE users SET locked_at=NULL, lock_reason=NULL WHERE id=$1', [rpt.reported_user_id]);
    }

    res.json({ message: 'Report updated' });
  } catch (err) { next(err); }
};

module.exports = { submitReport, getMyReports, generatePolicePacket, sendToPolice, resolveReport };
