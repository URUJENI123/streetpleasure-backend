const router   = require('express').Router();
const express  = require('express');
const { authenticate } = require('../middleware/auth');
const { pollMomoStatus, getMyPayments, stripeWebhook } = require('../controllers/paymentController');

// Stripe webhook needs raw body
router.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => { req.rawBody = req.body; next(); },
  stripeWebhook
);

router.get('/',       authenticate, getMyPayments);
router.get('/:id/status', authenticate, pollMomoStatus);

module.exports = router;