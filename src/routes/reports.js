const router   = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, requireVerified, requireRole } = require('../middleware/auth');
const {
  submitReport, getMyReports, generatePolicePacket, sendToPolice, resolveReport,
} = require('../controllers/reportController');

router.post('/',
  authenticate, requireVerified,
  [
    body('reported_user_id').isUUID(),
    body('entity_type').isIn(['activity','event','user','message']),
    body('entity_id').isUUID(),
    body('reason').isIn(['scam','harassment','fake_event','dangerous','no_show','other']),
    body('description').optional().trim().isLength({ max: 1000 }),
  ],
  validate, submitReport
);

router.get('/mine', authenticate, getMyReports);

router.get('/:id/police-packet', authenticate, generatePolicePacket);

router.post('/:id/send-to-police', authenticate, sendToPolice);

router.patch('/:id/resolve',
  authenticate, requireRole('admin'),
  [
    body('status').isIn(['resolved','false_flag']),
    body('admin_note').optional().trim(),
    body('unlock_user').optional().isBoolean(),
  ],
  validate, resolveReport
);

module.exports = router;