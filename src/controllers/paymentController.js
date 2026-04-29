const { query }           = require('../config/db');
const { getPaymentStatus } = require('../services/momo');
const { notFound }        = require('../utils/errors');

// Poll MoMo payment status and update DB
const pollMomoStatus = async (req, res, next) => {
  try {
    const { rows: [pmt] } = await query(
      'SELECT * FROM payments WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]
    );
    if (!pmt) return next(notFound('Payment not found'));

    if (pmt.method === 'momo' && pmt.provider_ref) {
      const status = await getPaymentStatus(pmt.provider_ref);
      const mapped = status === 'SUCCESSFUL' ? 'held'
                   : status === 'FAILED'     ? 'failed'
                   : 'pending';

      if (mapped !== pmt.status) {
        await query('UPDATE payments SET status=$1, updated_at=NOW() WHERE id=$2', [mapped, pmt.id]);
        // If paid, mark attendee as paid
        if (mapped === 'held') {
          await query(
            'UPDATE event_attendees SET paid=TRUE WHERE payment_id=$1', [pmt.id]
          );
        }
      }
      return res.json({ status: mapped, providerStatus: status });
    }

    res.json({ status: pmt.status });
  } catch (err) { next(err); }
};

const getMyPayments = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT p.*, e.title AS event_title
      FROM payments p
      LEFT JOIN events e ON e.id = p.event_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json({ payments: rows });
  } catch (err) { next(err); }
};

// Stripe webhook — capture/cancel based on Stripe events
const stripeWebhook = async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig    = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    if (event.type === 'payment_intent.amount_capturable_updated') {
      const pi = event.data.object;
      await query(
        "UPDATE payments SET status='held' WHERE provider_ref=$1", [pi.id]
      );
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      await query(
        "UPDATE payments SET status='failed' WHERE provider_ref=$1", [pi.id]
      );
    }

    res.json({ received: true });
  } catch (err) { next(err); }
};

module.exports = { pollMomoStatus, getMyPayments, stripeWebhook };