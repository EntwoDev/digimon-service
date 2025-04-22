const express = require('express');
const router = express.Router();
const plamoController = require('../controllers/PlamoController');

router.get('/loadnet', plamoController.getLoadNet);

module.exports = router;