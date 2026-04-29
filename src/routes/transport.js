const router   = require('express').Router();
const { body, query: qv } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireVerified } = require('../middleware/auth');
const { requestTransport, getTransportGroups, joinTransportGroup } = require('../controllers/transportController');

router.post('/request',
  authenticate, requireVerified,
  [
    body('event_or_activity_id').isUUID(),
    body('entity_type').isIn(['activity', 'event']),
    body('lat').isFloat(),
    body('lon').isFloat(),
    body('from_address').trim().notEmpty(),
    body('seats_needed').optional().isInt({ min: 1, max: 4 }),
  ],
  validate, requestTransport
);

router.get('/groups',
  authenticate,
  [qv('event_id').isUUID()],
  validate, getTransportGroups
);

router.post('/groups/:id/join',
  authenticate, requireVerified,
  [body('phone_number').optional().isMobilePhone()],
  validate, joinTransportGroup
);

module.exports = router;