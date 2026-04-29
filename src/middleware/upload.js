const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3, BUCKET } = require('../config/s3');
const path = require('path');

const ALLOWED_MIME = ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime'];

const upload = multer({
  storage: multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const folder = req.uploadFolder || 'misc';
      const ext    = path.extname(file.originalname);
      cb(null, `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

module.exports = upload;
