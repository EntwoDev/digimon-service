const monitoringService = require('../services/MonitoringService')

exports.monitoring_u3 = (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

   monitoringService.getData(res);
}