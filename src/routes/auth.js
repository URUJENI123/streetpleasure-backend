const router  = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const upload   = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const { authLimiter }  = require('../middleware/rateLimiter');
const {
  register, verifyOtpHandler, refreshTokenHandler, logout, verifyId,
} = require('../controllers/authController');

router.post('/register',
  authLimiter,
  [body('phone_number').isMobilePhone().withMessage('Valid phone number required')],
  validate, register
);

router.post('/verify-otp',
  authLimiter,
  [
    body('phone_number').isMobilePhone(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  validate, verifyOtpHandler
);

router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validate, refreshTokenHandler
);

router.post('/logout', authenticate, logout);

router.post('/verify-id',
  authenticate,
  (req, _res, next) => { req.uploadFolder = 'id-verification'; next(); },
  upload.fields([{ name: 'id_image', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]),
  [body('id_type').optional().isIn(['NATIONAL_ID', 'PASSPORT'])],
  validate, verifyId
);

module.exports = router;