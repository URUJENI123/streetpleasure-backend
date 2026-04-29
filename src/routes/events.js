const router   = require('express').Router();
const { body, query: qv } = require('express-validator');
const validate = require('../middleware/validate');
const upload   = require('../middleware/upload');
const { authenticate, requireVerified, requireRole } = require('../middleware/auth');
const {
  listEvents, getEvent, createEvent, publishEvent,
  bookEvent, checkinAttendee, getTicketQR, cancelEvent,
} = require('../controllers/eventController');

router.get('/',
  authenticate,
  [qv('lat').isFloat(), qv('lon').isFloat()],
  validate, listEvents
);

router.post('/',
  authenticate,
  requireRole('host_guide', 'admin'),
  (req, _res, next) => { req.uploadFolder = 'event-images'; next(); },
  upload.single('image'),
  [
    body('title').trim().isLength({ min: 3, max: 200 }),
    body('lat').isFloat(),
    body('lon').isFloat(),
    body('address_text').trim().notEmpty(),
    body('start_time').isISO8601(),
    body('end_time').isISO8601(),
    body('capacity').isInt({ min: 1, max: 5000 }),
    body('price').optional().isFloat({ min: 0 }),
    body('currency').optional().isIn(['RWF', 'USD', 'EUR']),
  ],
  validate, createEvent
);

router.get('/:id', authenticate, getEvent);

router.post('/:id/publish',
  authenticate, requireRole('host_guide', 'admin'),
  publishEvent
);

router.post('/:id/book',
  authenticate, requireVerified,
  [
    body('payment_method').optional().isIn(['momo', 'stripe', 'free']),
    body('phone_number').optional().isMobilePhone(),
  ],
  validate, bookEvent
);

router.post('/:id/checkin',
  authenticate, requireRole('host_guide', 'admin'),
  [body('ticket_code').trim().notEmpty()],
  validate, checkinAttendee
);

router.get('/:id/qr', authenticate, getTicketQR);

router.put('/:id/cancel', authenticate, cancelEvent);

module.exports = router;