const { mysqlDB, mssqlDB } = require("../config/database");
const logger = require("../utils/logger");

class DigimonRepository {
    async loadStatus() {
        try {
            const pool = await mssqlDB();
            const result = await pool.request()
                .query("SELECT TOP 1 * FROM [digital-monitoring].[vw_status]");

            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }

    async loadResStat() {
        try {
            const pool = await mssqlDB();
            const result = await pool.request()
                .query("SELECT TOP 1 stStatus FROM [digital-monitoring].[tblt_statussumary] WHERE stId = 1");

            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }

    async loadSummary() {
        try {
            const pool = await mssqlDB();
            const result = await pool.request()
                .query("SELECT * FROM [digital-monitoring].[vw_sumary]");

            return result.recordset.length > 0 ? result.recordset : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }
}

module.exports = DigimonRepository;
