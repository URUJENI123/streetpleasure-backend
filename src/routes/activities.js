const router   = require('express').Router();
const { body, query: qv } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const {
  listActivities, getActivity, createActivity, joinActivity,
  leaveActivity, checkinParticipant, rateParticipants, cancelActivity,
} = require('../controllers/activityController');

router.get('/',
  authenticate,
  [qv('lat').isFloat(), qv('lon').isFloat()],
  validate, listActivities
);

router.post('/',
  authenticate, requireVerified,
  [
    body('title').trim().isLength({ min: 3, max: 150 }),
    body('activity_type').isIn(['club','hike','sports','meal','movie','adventure','other']),
    body('lat').isFloat({ min: -90,  max: 90 }),
    body('lon').isFloat({ min: -180, max: 180 }),
    body('address_text').trim().notEmpty(),
    body('scheduled_at').isISO8601(),
    body('max_participants').optional().isInt({ min: 2, max: 6 }),
  ],
  validate, createActivity
);

router.get('/:id', authenticate, getActivity);

router.post('/:id/join', authenticate, requireVerified, joinActivity);

router.post('/:id/leave', authenticate, leaveActivity);

router.post('/:id/checkin',
  authenticate, requireVerified,
  [body('user_id').isUUID()],
  validate, checkinParticipant
);

router.post('/:id/rate',
  authenticate,
  [body('ratings').isArray({ min: 1 })],
  validate, rateParticipants
);

router.put('/:id/cancel', authenticate, cancelActivity);

module.exports = router;