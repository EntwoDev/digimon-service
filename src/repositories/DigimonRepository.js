const { mysqlDB, mssqlDB } = require("../config/database");
const logger = require("../utils/logger");


class DigimonRepository {
    async loadStatus() {
        try {
            const pool = await mssqlDB();
            const [rows] = await pool.query('SELECT TOP 1 * FROM [digital-monitoring].[vw_status]');

            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }

    async loadResStat() {
        try {
            const pool = await mssqlDB();
            const [rows] = await pool.query('SELECT TOP 1 stStatus FROM [digital-monitoring].[tblt_statussumary] WHERE stId = 1');

            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }

    async loadSummary() {
        try {
            const pool = await mssqlDB();
            const [rows] = await pool.query('SELECT * FROM [digital-monitoring].[vw_sumary]');

            return rows.length > 0 ? rows : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }
}

module.exports = DigimonRepository