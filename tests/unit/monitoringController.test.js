const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const monitoringController = require('../../src/controllers/MonitoringController');
const monitoringService = require('../../src/services/MonitoringService');

class MockResponse extends EventEmitter {
    constructor() {
        super();
        this.headers = {};
    }
    set(headers) {
        Object.assign(this.headers, headers);
        return this;
    }
    write() {}
    end() {}
}

describe('controllers/MonitoringController', () => {
    test('menyiapkan header SSE yang tepat dan meneruskan request ke service', (t) => {
        const req = {
            ip: '192.168.1.100',
            headers: {},
            socket: { remoteAddress: '192.168.1.100' },
        };
        const res = new MockResponse();

        let serviceCalled = false;
        let receivedMeta = null;
        const origGetData = monitoringService.getData;
        monitoringService.getData = (resParam, meta) => {
            serviceCalled = true;
            receivedMeta = meta;
        };

        try {
            monitoringController.monitoring_u3(req, res);

            assert.equal(res.headers['Content-Type'], 'text/event-stream');
            assert.equal(res.headers['Cache-Control'], 'no-cache');
            assert.equal(res.headers['Connection'], 'keep-alive');
            assert.equal(res.headers['X-Accel-Buffering'], 'no');

            assert.equal(serviceCalled, true);
            assert.deepEqual(receivedMeta, { ip: '192.168.1.100' });
        } finally {
            monitoringService.getData = origGetData;
        }
    });
});
