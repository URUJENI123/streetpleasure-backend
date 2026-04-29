const router   = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const upload   = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const { getMe, updateMe, getUser } = require('../controllers/userController');

router.get('/me',  authenticate, getMe);

router.put('/me',
  authenticate,
  (req, _res, next) => { req.uploadFolder = 'avatars'; next(); },
  upload.single('avatar'),
  [
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('bio').optional().trim().isLength({ max: 300 }),
    body('fcm_token').optional().isString(),
  ],
  validate, updateMe
);

router.get('/:id', authenticate, getUser);

module.exports = router;