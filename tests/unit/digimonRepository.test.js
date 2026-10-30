const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Stub MSSQL database pool
let executedQuery = '';
const mockPool = {
    request() {
        return {
            query: async (sql) => {
                executedQuery = sql;
                return {
                    recordset: [
                        { sumId: '1', sumBulan: '1', sumNetT: '312235' },
                        { sumId: '2', sumBulan: '2', sumNetT: '286774' },
                    ],
                };
            },
        };
    },
};

const databaseMock = {
    mssqlDB: async () => mockPool,
    mysqlDB: async () => mockPool,
};

// Module interceptor for testing
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (moduleName) {
    if (moduleName === '../config/database') {
        return databaseMock;
    }
    return originalRequire.apply(this, arguments);
};

const DigimonRepository = require('../../src/repositories/DigimonRepository');

describe('repositories/DigimonRepository', () => {
    let repo;

    before(() => {
        repo = new DigimonRepository();
    });

    beforeEach(() => {
        executedQuery = '';
    });

    after(() => {
        Module.prototype.require = originalRequire;
    });

    test('loadStatus menjalankan query TOP 1 pada vw_status', async () => {
        await repo.loadStatus();
        assert.ok(executedQuery.includes('SELECT TOP 1 * FROM [digital-monitoring].[vw_status]'));
    });

    test('loadResStat menjalankan query stStatus pada tblt_statussumary', async () => {
        await repo.loadResStat();
        assert.ok(executedQuery.includes('SELECT TOP 1 stStatus FROM [digital-monitoring].[tblt_statussumary] WHERE stId = 1'));
    });

    test('loadSummary menjalankan query pada vw_sumary dengan klausa ORDER BY [sumBulan]', async () => {
        const result = await repo.loadSummary();
        assert.ok(executedQuery.includes('SELECT * FROM [digital-monitoring].[vw_sumary] ORDER BY [sumBulan]'));
        assert.equal(result.length, 2);
    });
});
