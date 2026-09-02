const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { formatDate } = require('../../src/utils/time');

describe('utils/time - formatDate', () => {
    test('formats valid ISO date string correctly to DD-MM-YYYY', () => {
        assert.equal(formatDate('2025-04-16T00:00:00.000Z'), '16-04-2025');
        assert.equal(formatDate('2026-01-05'), '05-01-2026');
    });

    test('formats Date instance correctly', () => {
        const d = new Date(2025, 8, 2); // 2 Sep 2025 (0-indexed month)
        assert.equal(formatDate(d), '02-09-2025');
    });

    test('returns null when input is null, undefined, or empty', () => {
        assert.equal(formatDate(null), null);
        assert.equal(formatDate(undefined), null);
        assert.equal(formatDate(''), null);
    });

    test('returns original string if date string is invalid', () => {
        assert.equal(formatDate('invalid-date'), 'invalid-date');
    });
});
