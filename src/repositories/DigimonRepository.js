const { mysqlDB } = require("../config/database");
const logger = require("../utils/logger");

class DigimonRepository {
    async loadStatus() {
        try {
            const pool = await mysqlDB();
            const [rows] = await pool.query('SELECT * FROM vw_status limit 1');

            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }

    async loadResStat() {
        try {
            const pool = await mysqlDB();
            const [rows] = await pool.query('SELECT stStatus FROM tblt_statussumary WHERE stId = 1 limit 1');

            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }

    async loadSummary() {
        try {
            const pool = await mysqlDB();
            const [rows] = await pool.query('SELECT * FROM vw_sumary');

            return rows.length > 0 ? rows : null;
        } catch (err) {
            logger.error(`DigimonRepository Error: ${err.message}`);
            throw err;
        }
    }
}

module.exports = DigimonRepository