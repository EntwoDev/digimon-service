const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/MonitoringController');

router.get('/', monitoringController.monitoring_u3);

module.exports = router;