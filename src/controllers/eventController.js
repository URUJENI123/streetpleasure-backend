const { query }      = require('../config/db');
const { send, sendToMany } = require('../services/fcm');
const { requestPayment, getPaymentStatus } = require('../services/momo');
const { capturePayment, cancelPayment }    = require('../services/stripe');
const { generateTicket }  = require('../services/qrCode');
const { boundingBox, filterByRadius } = require('../utils/geo');
const { badReq, notFound, forbidden } = require('../utils/errors');
const QRCode = require('qrcode');

const listEvents = async (req, res, next) => {
  try {
    const { lat, lon, radius = 10000, category, price_max, date_from, date_to, limit = 20, offset = 0 } = req.query;
    if (!lat || !lon) return next(badReq('lat and lon required'));

    const cLat = parseFloat(lat);
    const cLon = parseFloat(lon);
    const bbox = boundingBox(cLat, cLon, parseInt(radius));

    const params = [bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon];
    let conditions = [
      "e.status = 'published'",
      'e.start_time > NOW()',
      'e.lat BETWEEN $1 AND $2',
      'e.lon BETWEEN $3 AND $4',
    ];
    let idx = 5;

    if (category)  { conditions.push(`e.category = $${idx++}`);      params.push(category); }
    if (price_max) { conditions.push(`e.price <= $${idx++}`);         params.push(parseFloat(price_max)); }
    if (date_from) { conditions.push(`e.start_time >= $${idx++}`);    params.push(date_from); }
    if (date_to)   { conditions.push(`e.start_time <= $${idx++}`);    params.push(date_to); }

    const { rows: raw } = await query(`
      SELECT e.*, u.full_name AS host_name, u.avatar_url AS host_avatar,
             u.rating_avg AS host_rating,
             COUNT(ea.user_id) FILTER (WHERE ea.paid=TRUE) AS attendee_count
      FROM events e
      JOIN users u ON u.id = e.host_id
      LEFT JOIN event_attendees ea ON ea.event_id = e.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY e.id, u.full_name, u.avatar_url, u.rating_avg
    `, params);

    const filtered = filterByRadius(raw, cLat, cLon, parseInt(radius))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({ events: filtered });
  } catch (err) { next(err); }
};

const getEvent = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT e.*, u.full_name AS host_name, u.avatar_url AS host_avatar,
             COUNT(ea.user_id) FILTER (WHERE ea.paid=TRUE) AS paid_count
      FROM events e
      JOIN users u ON u.id = e.host_id
      LEFT JOIN event_attendees ea ON ea.event_id = e.id
      WHERE e.id = $1
      GROUP BY e.id, u.full_name, u.avatar_url
    `, [req.params.id]);

    if (!rows.length) return next(notFound('Event not found'));
    res.json({ event: rows[0] });
  } catch (err) { next(err); }
};

const createEvent = async (req, res, next) => {
  try {
    const {
      title, description, category, lat, lon, address_text,
      start_time, end_time, capacity, price = 0, currency = 'RWF',
      carpool_lat, carpool_lon,
    } = req.body;

    const imageUrl = req.file?.location || null;

    const { rows } = await query(`
      INSERT INTO events
        (host_id, title, description, category, lat, lon, address_text,
         start_time, end_time, capacity, price, currency, image_url,
         carpool_lat, carpool_lon, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft')
      RETURNING *
    `, [
      req.user.id, title, description, category,
      parseFloat(lat), parseFloat(lon), address_text,
      start_time, end_time, parseInt(capacity),
      parseFloat(price), currency, imageUrl,
      carpool_lat ? parseFloat(carpool_lat) : null,
      carpool_lon ? parseFloat(carpool_lon) : null,
    ]);

    res.status(201).json({ event: rows[0] });
  } catch (err) { next(err); }
};

const publishEvent = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM events WHERE id=$1', [req.params.id]);
    if (!rows.length) return next(notFound());
    if (rows[0].host_id !== req.user.id) return next(forbidden());
    await query("UPDATE events SET status='published' WHERE id=$1", [req.params.id]);
    res.json({ message: 'Event published' });
  } catch (err) { next(err); }
};

const bookEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_method, phone_number, stripe_payment_intent_id } = req.body;

    const { rows: [evt] } = await query('SELECT * FROM events WHERE id=$1', [id]);
    if (!evt) return next(notFound('Event not found'));
    if (evt.status !== 'published') return next(badReq('Event not open for booking'));

    const { rows: [{ cnt }] } = await query(
      'SELECT COUNT(*) AS cnt FROM event_attendees WHERE event_id=$1 AND paid=TRUE', [id]
    );
    if (parseInt(cnt) >= evt.capacity) return next(badReq('Event is sold out'));

    const { rows: existing } = await query(
      'SELECT 1 FROM event_attendees WHERE event_id=$1 AND user_id=$2', [id, req.user.id]
    );
    if (existing.length) return next(badReq('Already booked'));

    let paymentRecord = null;

    if (parseFloat(evt.price) > 0) {
      if (payment_method === 'momo') {
        const { referenceId } = await requestPayment({
          amount:      evt.price,
          phoneNumber: phone_number,
          paymentNote: `Ticket: ${evt.title}`,
          externalId:  `${id}-${req.user.id}`,
        });
        const { rows: [p] } = await query(`
          INSERT INTO payments(user_id, amount, currency, method, status, provider_ref, event_id)
          VALUES($1,$2,$3,'momo','pending',$4,$5) RETURNING *
        `, [req.user.id, evt.price, evt.currency, referenceId, id]);
        paymentRecord = p;
      } else if (payment_method === 'stripe') {
        const { rows: [p] } = await query(`
          INSERT INTO payments(user_id, amount, currency, method, status, provider_ref, event_id)
          VALUES($1,$2,'USD','stripe','held',$3,$4) RETURNING *
        `, [req.user.id, evt.price, stripe_payment_intent_id, id]);
        paymentRecord = p;
      }
    }

    const { code, qrDataUrl } = await generateTicket();

    await query(`
      INSERT INTO event_attendees(event_id, user_id, paid, amount, payment_id, ticket_code)
      VALUES($1,$2,$3,$4,$5,$6)
    `, [id, req.user.id, parseFloat(evt.price) === 0, evt.price, paymentRecord?.id, code]);

    const { rows: [host] } = await query('SELECT fcm_token FROM users WHERE id=$1', [evt.host_id]);
    if (host?.fcm_token) {
      await send({ token: host.fcm_token, title: 'New booking!', body: `Someone booked "${evt.title}"`, data: { eventId: id } });
    }

    res.status(201).json({
      message:       'Booked',
      ticketCode:    code,
      qrDataUrl,
      paymentRef:    paymentRecord?.provider_ref,
      paymentStatus: paymentRecord?.status || 'free',
    });
  } catch (err) { next(err); }
};

const checkinAttendee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ticket_code } = req.body;

    const { rows: [evt] } = await query('SELECT * FROM events WHERE id=$1', [id]);
    if (!evt) return next(notFound());
    if (evt.host_id !== req.user.id) return next(forbidden('Only host can check in'));

    const { rows: [att] } = await query(
      'SELECT * FROM event_attendees WHERE event_id=$1 AND ticket_code=$2', [id, ticket_code]
    );
    if (!att) return next(notFound('Ticket not found'));
    if (att.checked_in) return next(badReq('Already checked in'));

    await query(
      'UPDATE event_attendees SET checked_in=TRUE WHERE event_id=$1 AND ticket_code=$2', [id, ticket_code]
    );

    if (att.payment_id) {
      const { rows: [pmt] } = await query('SELECT * FROM payments WHERE id=$1', [att.payment_id]);
      if (pmt?.method === 'stripe' && pmt?.status === 'held' && pmt?.provider_ref) {
        await capturePayment(pmt.provider_ref);
        await query("UPDATE payments SET status='released', escrow_release_at=NOW() WHERE id=$1", [pmt.id]);
      }
      if (pmt?.method === 'momo' && pmt?.status === 'pending') {
        const status = await getPaymentStatus(pmt.provider_ref);
        if (status === 'SUCCESSFUL') {
          await query("UPDATE payments SET status='held' WHERE id=$1", [pmt.id]);
        }
      }
    }

    res.json({ message: 'Checked in', attendeeId: att.user_id });
  } catch (err) { next(err); }
};

const getTicketQR = async (req, res, next) => {
  try {
    const { rows: [att] } = await query(
      'SELECT ticket_code FROM event_attendees WHERE event_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!att) return next(notFound('No ticket found'));
    const qrDataUrl = await QRCode.toDataURL(`TWIKO:${att.ticket_code}`, { width: 300, errorCorrectionLevel: 'H' });
    res.json({ ticketCode: att.ticket_code, qrDataUrl });
  } catch (err) { next(err); }
};

const cancelEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: [evt] } = await query('SELECT * FROM events WHERE id=$1', [id]);
    if (!evt) return next(notFound());
    if (evt.host_id !== req.user.id && req.user.role !== 'admin') return next(forbidden());

    await query("UPDATE events SET status='cancelled' WHERE id=$1", [id]);

    const { rows: attendees } = await query(`
      SELECT ea.*, p.method, p.provider_ref, p.id AS pid
      FROM event_attendees ea
      LEFT JOIN payments p ON p.id = ea.payment_id
      WHERE ea.event_id=$1 AND ea.paid=TRUE
    `, [id]);

    for (const a of attendees) {
      if (a.method === 'stripe' && a.provider_ref) await cancelPayment(a.provider_ref).catch(() => {});
      if (a.pid) await query("UPDATE payments SET status='refunded' WHERE id=$1", [a.pid]);
    }

    const { rows: fcmRows } = await query(`
      SELECT u.fcm_token FROM users u
      JOIN event_attendees ea ON ea.user_id = u.id
      WHERE ea.event_id=$1 AND u.fcm_token IS NOT NULL
    `, [id]);

    await sendToMany({
      tokens: fcmRows.map((r) => r.fcm_token),
      title:  'Event cancelled',
      body:   `"${evt.title}" was cancelled. Refunds are being processed.`,
      data:   { eventId: id, type: 'cancel' },
    });

    res.json({ message: 'Event cancelled, refunds initiated' });
  } catch (err) { next(err); }
};

module.exports = {
  listEvents, getEvent, createEvent, publishEvent,
  bookEvent, checkinAttendee, getTicketQR, cancelEvent,
};