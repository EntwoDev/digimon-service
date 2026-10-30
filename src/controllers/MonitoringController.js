const monitoringService = require('../services/MonitoringService');

exports.monitoring_u3 = (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Menghindari buffering pada Nginx proxy
    });

    const reqMeta = {
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    };

    monitoringService.getData(res, reqMeta);
};
