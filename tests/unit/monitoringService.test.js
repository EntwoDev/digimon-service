const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const path = require('path');
const fs = require('fs');

// Arahkan log ke direktori sementara agar test tidak mengotori src/log
const testLogDir = path.resolve(__dirname, '../../test-logs-service');
process.env.LOG_DIR = testLogDir;
process.env.LOG_THROTTLE_MS = '500';

const monitoringService = require('../../src/services/MonitoringService');

/** Fake response object yang meniru perilaku Express response untuk SSE */
class FakeRes extends EventEmitter {
    constructor() {
        super();
        this.chunks = [];
        this.ended = false;
        this.headers = {};
    }
    set(obj) {
        Object.assign(this.headers, obj);
        return this;
    }
    write(chunk) {
        this.chunks.push(chunk);
        return true;
    }
    end() {
        this.ended = true;
    }
    /** Ambil payload JSON dari event SSE `data:` terakhir */
    lastData() {
        const dataChunks = this.chunks.filter((c) => c.startsWith('data: '));
        if (!dataChunks.length) return null;
        return JSON.parse(dataChunks[dataChunks.length - 1].replace(/^data: /, '').trim());
    }
    lastErrorEvent() {
        const errChunks = this.chunks.filter((c) => c.startsWith('event: error'));
        if (!errChunks.length) return null;
        const raw = errChunks[errChunks.length - 1].split('data: ')[1];
        return JSON.parse(raw.trim());
    }
}

const sampleOmRow = {
    TARGETNETPRODU3: 9405160,
    TARGETCFU3: '63,82',
    NETPROD3: '8245760',
    U3NCF: '55.96',
    NPHR3: '2975.39',
    TARGETNPHRU3: '2601',
    TANGGAL: '2025-04-16T00:00:00.000Z',
};

function stubRepositories(overrides = {}) {
    monitoringService.plamoRepository = {
        loadNet: async () => [
            { name: 'NET POWER UNIT 3 kW', value: 343712.938, source: 'pi' },
            { name: 'NET POWER UNIT 3 MW', value: 343.71, source: 'pi' },
        ],
        ...overrides.plamo,
    };
    monitoringService.digimonRepository = {
        loadStatus: async () => [{ namaStatus: 'NORMAL' }],
        loadResStat: async () => ({ stStatus: 1 }),
        loadSummary: async () => [{ sumKode: 'jan', sumNphrT: '2611' }],
        ...overrides.digimon,
    };
    monitoringService.maximoRepository = {
        loadDaily: async () => [{ TANGGAL: '2025-04-16', NPHR3: '2975,39' }],
        loadNetProdToday: async () => [sampleOmRow],
        loadAvg: async () => [{ AVERAGE: '3034.95' }],
        loadSummary: async (month) => [{ month, TARGETNPHRU3: '2601' }],
        ...overrides.maximo,
    };
}

describe('services/MonitoringService', () => {
    before(() => {
        if (!fs.existsSync(testLogDir)) fs.mkdirSync(testLogDir, { recursive: true });
    });

    after(() => {
        if (fs.existsSync(testLogDir)) fs.rmSync(testLogDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        // Reset cache dan counter agar setiap test independen
        monitoringService.cacheData = null;
        monitoringService.lastFetchTime = 0;
        monitoringService.activeClients = 0;
    });

    test('memiliki 12 definisi bulan dengan label dan value yang benar', () => {
        assert.equal(monitoringService.monthData.length, 12);
        assert.deepEqual(monitoringService.monthData[0], { label: 'jan', val: 1 });
        assert.deepEqual(monitoringService.monthData[11], { label: 'des', val: 12 });
    });

    test('menaikkan activeClients saat client connect dan menurunkan saat close', async () => {
        stubRepositories();
        const res = new FakeRes();

        await monitoringService.getData(res, { ip: '127.0.0.1' });
        assert.equal(monitoringService.activeClients, 1);

        res.emit('close');
        assert.equal(monitoringService.activeClients, 0);
        assert.equal(res.ended, true);
    });

    test('activeClients tidak pernah bernilai negatif meski close dipanggil berulang', async () => {
        stubRepositories();
        const res = new FakeRes();

        await monitoringService.getData(res, {});
        res.emit('close');
        res.emit('close');

        assert.ok(monitoringService.activeClients >= 0);
    });

    test('mengirim payload target dari Maximo saat stStatus == 1', async (t) => {
        stubRepositories();
        const res = new FakeRes();

        await monitoringService.getData(res, {});
        await new Promise((r) => setTimeout(r, 1200));
        res.emit('close');

        const payload = res.lastData();
        assert.ok(payload, 'payload SSE harus terkirim');

        // Target diambil dari kolom Maximo dan dinormalisasi
        assert.deepEqual(payload.tnetprod, [9405160 / 1000]);
        assert.deepEqual(payload.tncf, ['63,82']);
        assert.deepEqual(payload.tnphr, [2601]);
        assert.deepEqual(payload.netprod, [8245760 / 1000]);
        assert.deepEqual(payload.tanggal, ['16-04-2025']);
        assert.equal(payload.st, 1);
        assert.deepEqual(payload.averagenphr, { AVERAGE: '3034.95' });

        // Verifikasi loadNet PLAMO di-merge ke payload utama
        assert.deepEqual(payload["0"], { name: 'NET POWER UNIT 3 kW', value: 343712.938, source: 'pi' });
        assert.deepEqual(payload["1"], { name: 'NET POWER UNIT 3 MW', value: 343.71, source: 'pi' });
    });

    test('melanjutkan payload normal meski PI/PLAMO timeout atau error', async () => {
        stubRepositories({ plamo: { loadNet: async () => { throw new Error('Timeout PI'); } } });
        const res = new FakeRes();

        await monitoringService.getData(res, {});
        await new Promise((r) => setTimeout(r, 1200));
        res.emit('close');

        const payload = res.lastData();
        assert.ok(payload, 'payload SSE harus terkirim');
        assert.equal(payload["0"], undefined, 'Data PI/PLAMO harusnya kosong');
        assert.deepEqual(payload.tnetprod, [9405160 / 1000], 'Data Maximo lainnya tetap tersedia');
    });

    test('fallback ke summary Maximo per bulan saat stStatus != 1', async () => {
        stubRepositories({ digimon: { loadResStat: async () => ({ stStatus: 0 }) } });
        const res = new FakeRes();

        await monitoringService.getData(res, {});
        await new Promise((r) => setTimeout(r, 1200));
        res.emit('close');

        const payload = res.lastData();
        assert.ok(payload, 'payload SSE harus terkirim');
        assert.ok(Array.isArray(payload.bulan), 'bulan harus berupa array');
        assert.equal(payload.bulan.length, 12);
        assert.ok(payload.bulan[0].jan, 'entri bulan pertama harus berlabel jan');
        assert.equal(payload.tnetprod, undefined, 'mode fallback hanya mengirim data bulan');
    });

    test('mengirim event error SSE tanpa membuat proses crash saat repository gagal', async () => {
        stubRepositories({
            digimon: {
                loadStatus: async () => {
                    throw new Error('connect ETIMEDOUT 192.168.29.2:443');
                },
            },
        });
        const res = new FakeRes();

        await monitoringService.getData(res, {});
        await new Promise((r) => setTimeout(r, 1200));
        res.emit('close');

        const errPayload = res.lastErrorEvent();
        assert.ok(errPayload, 'event error harus terkirim ke client');
        assert.match(errPayload.error, /ETIMEDOUT/);
    });

    test('menggunakan cache dan tidak query ulang dalam rentang cacheDuration', async () => {
        let statusCalls = 0;
        stubRepositories({
            digimon: {
                loadStatus: async () => {
                    statusCalls += 1;
                    return [{ namaStatus: 'NORMAL' }];
                },
            },
        });

        monitoringService.cacheDuration = 60000; // cache panjang untuk memaksa hit cache
        const res = new FakeRes();

        await monitoringService.getData(res, {});
        await new Promise((r) => setTimeout(r, 2200)); // ~2 tick interval
        res.emit('close');

        assert.equal(statusCalls, 1, 'query hanya dijalankan sekali karena cache masih valid');
        monitoringService.cacheDuration = 1000; // kembalikan default
    });

    test('membersihkan interval setelah client close sehingga tidak ada penulisan lanjutan', async () => {
        stubRepositories();
        const res = new FakeRes();

        await monitoringService.getData(res, {});
        await new Promise((r) => setTimeout(r, 1200));
        res.emit('close');

        const countAfterClose = res.chunks.length;
        await new Promise((r) => setTimeout(r, 1200));

        assert.equal(res.chunks.length, countAfterClose, 'tidak boleh ada write setelah close');
    });
});
