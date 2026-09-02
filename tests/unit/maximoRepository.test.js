const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Stub dependencies
const mockConnection = {
    executeArgs: [],
    closeCalled: 0,
    async execute(query, binds, options) {
        this.executeArgs.push({ query, binds, options });
        return { rows: [{ mocked: true }] };
    },
    async close() {
        this.closeCalled++;
    }
};

const mockPool = {
    async getConnection() {
        return mockConnection;
    }
};

const databaseMock = {
    oracleDB: async () => mockPool
};

// We intercept requires to substitute our mock
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (moduleName) {
    if (moduleName === '../config/database') {
        return databaseMock;
    }
    return originalRequire.apply(this, arguments);
};

const MaximoRepository = require('../../src/repositories/MaximoRepository');

describe('repositories/MaximoRepository', () => {
    let repo;

    before(() => {
        repo = new MaximoRepository();
    });

    beforeEach(() => {
        mockConnection.executeArgs = [];
        mockConnection.closeCalled = 0;
    });

    after(() => {
        // Restore require
        Module.prototype.require = originalRequire;
    });

    test('loadDaily mengembalikan baris yang direturn dari connection.execute dan menutup connection', async () => {
        const result = await repo.loadDaily();
        
        assert.equal(mockConnection.executeArgs.length, 1);
        assert.ok(mockConnection.executeArgs[0].query.includes('FROM MAXIMO.OMLAPORAN'));
        assert.deepEqual(result, [{ mocked: true }]);
        assert.equal(mockConnection.closeCalled, 1);
    });

    test('loadNetProdToday mengembalikan baris yang direturn dari connection.execute', async () => {
        const result = await repo.loadNetProdToday();
        
        assert.equal(mockConnection.executeArgs.length, 1);
        assert.ok(mockConnection.executeArgs[0].query.includes('OMLAPORAN.TARGETNETPRODU3'));
        assert.deepEqual(result, [{ mocked: true }]);
        assert.equal(mockConnection.closeCalled, 1);
    });

    test('loadAvg mengembalikan baris yang direturn dari connection.execute', async () => {
        const result = await repo.loadAvg();
        
        assert.equal(mockConnection.executeArgs.length, 1);
        assert.ok(mockConnection.executeArgs[0].query.includes('AVG(NPHR3) AS AVERAGE'));
        assert.deepEqual(result, [{ mocked: true }]);
        assert.equal(mockConnection.closeCalled, 1);
    });

    test('loadSummary dengan argumen string mem-binding bulan dengan padding nol', async () => {
        await repo.loadSummary('5');
        
        assert.equal(mockConnection.executeArgs.length, 1);
        const { binds } = mockConnection.executeArgs[0];
        
        assert.deepEqual(binds, { month: '05' });
        assert.equal(mockConnection.closeCalled, 1);
    });

    test('loadSummary dengan argumen integer mem-binding bulan dengan aman (mencegah TypeError padStart)', async () => {
        // Ini test untuk mensimulasikan perbaikan bug:
        // TypeError: month.padStart is not a function
        // Karena `month` di service sebelumnya dikirim sebagai Number (mis: 1, 2, 3)
        await repo.loadSummary(5);
        
        assert.equal(mockConnection.executeArgs.length, 1);
        const { binds } = mockConnection.executeArgs[0];
        
        assert.deepEqual(binds, { month: '05' });
        assert.equal(mockConnection.closeCalled, 1);
    });

    test('loadSummary dengan argumen sudah memiliki 2 digit tidak merubah valuenya', async () => {
        await repo.loadSummary(12);
        
        assert.equal(mockConnection.executeArgs.length, 1);
        const { binds } = mockConnection.executeArgs[0];
        
        assert.deepEqual(binds, { month: '12' });
        assert.equal(mockConnection.closeCalled, 1);
    });
});
