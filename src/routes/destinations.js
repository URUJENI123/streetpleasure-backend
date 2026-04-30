const router = require('express').Router();
const { listDestinations, getDestination } = require('../controllers/destinationController');

// Public routes — no auth required for tourism discovery
router.get('/',    listDestinations);
router.get('/:id', getDestination);

module.exports = router;
