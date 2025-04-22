const oracledb = require('oracledb');
const { oracleDB } = require("../config/database");
const logger = require("../utils/logger");

class MaximoRepository {
    async loadDaily() {
        let connection;
        try {
            const pool = await oracleDB();
            connection = await pool.getConnection();
            const result = await connection.execute(`SELECT F1.*
                FROM (
                    SELECT TANGGAL,
                            OMLAPORAN.AFAU3 AS AFA3,
                            OMLAPORAN.TARGETAFAU3 AS TARGETAFAU3, OMLAPORAN.U3NCF,OMLAPORAN.TARGETCFU3,OMLAPORAN.TARGETNETPRODU3, OMLAPORAN.NPHR3, OMLAPORAN.NETPROD3, OMLAPORAN.TARGETNPHRU3, TO_CHAR(OMLAPORAN.EFORKPIU3) AS EFORKPIU3, OMLAPORAN.TOTALNETTOU3, OMLAPORAN.REGU
                    FROM MAXIMO.OMLAPORAN
                    WHERE TANGGAL IS NOT NULL AND NETPROD3 IS NOT NULL 
                    ORDER BY TANGGAL DESC
                ) F1
                WHERE ROWNUM <=1`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            if (result.rows.length > 0) {
                return result.rows
            }
            return null;
        } catch (err) {
            logger.error(`Oracle MaximoRepository Error: ${err.message}`);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeErr) {
                    logger.error(`Oracle Connection Close Error: ${closeErr.message}`);
                }
            }
        }
    }

    async loadNetProdToday() {
        let connection;
        try {
            const pool = await oracleDB();
            connection = await pool.getConnection();
            const result = await connection.execute(`SELECT *
                FROM (
                    SELECT
                        OMLAPORAN.NETPROD3,
                        TO_CHAR(OMLAPORAN.U3NCF) AS U3NCF,
                        OMLAPORAN.TARGETNPHRU3,
                        OMLAPORAN.TANGGAL,
                        CASE
                            WHEN OMLAPORAN.NPHR3 = '0' THEN NULL
                            ELSE OMLAPORAN.NPHR3
                        END AS NPHR3
                    FROM MAXIMO.OMLAPORAN
                    WHERE TANGGAL IS NOT NULL
                    ORDER BY TANGGAL DESC
                )
                WHERE ROWNUM <= 4`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            if (result.rows.length > 0) {
                return result.rows
            }
            return null;
        } catch (err) {
            logger.error(`Oracle MaximoRepository Error: ${err.message}`);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeErr) {
                    logger.error(`Oracle Connection Close Error: ${closeErr.message}`);
                }
            }
        }
    }

    async loadAvg() {
        let connection;
        try {
            const pool = await oracleDB();
            connection = await pool.getConnection();
            const result = await connection.execute(`SELECT AVG(NPHR3) AS AVERAGE 
                FROM MAXIMO.OMLAPORAN WHERE TANGGAL IS NOT NULL AND TO_CHAR(TANGGAL, 'MM-YYYY') = to_char(sysdate - 1,'MM-YYYY') 
                AND NPHR3 !=0`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            if (result.rows.length > 0) {
                return result.rows
            }
            return null;
        } catch (err) {
            logger.error(`Oracle MaximoRepository Error: ${err.message}`);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeErr) {
                    logger.error(`Oracle Connection Close Error: ${closeErr.message}`);
                }
            }
        }
    }

    async loadSummary(month) {
        let connection;
        try {
            const pool = await oracleDB();
            connection = await pool.getConnection();
            const result = await connection.execute(`SELECT
                TARGETNPHRU3,
                NPHR3,
                TOTALNETTOU3,
                AFAU3,
                TARGETAFAU3,
                NETPROD3,
                TANGGAL,
                TO_CHAR(EFORKPIU3, '9990.99') AS EFORKPIU3,
                1 + TRUNC(LAST_DAY(TANGGAL)) - TRUNC(TANGGAL, 'MM') AS JUMLAHHARI,
                (
                SELECT AVG(NPHR3)
                FROM MAXIMO.OMLAPORAN
                WHERE TANGGAL IS NOT NULL
                    AND TO_CHAR(TANGGAL, 'MM') = '01'
                    AND TO_CHAR(TANGGAL, 'YYYY') = TO_CHAR(SYSDATE - 1, 'YYYY')
                ) AS TARGETNPHR
            FROM MAXIMO.OMLAPORAN
            WHERE TANGGAL IS NOT NULL
            AND TO_CHAR(TANGGAL, 'YYYY') = TO_CHAR(SYSDATE, 'YYYY')
            AND TO_CHAR(TANGGAL, 'MM') = :month
            AND NPHR3 != 0
            AND ROWNUM = 1
            ORDER BY TANGGAL DESC`, {month:month.padStart(2, '0')}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            if (result.rows.length > 0) {
                return result.rows
            }
            return null;
        } catch (err) {
            logger.error(`Oracle MaximoRepository Error: ${err.message}`);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeErr) {
                    logger.error(`Oracle Connection Close Error: ${closeErr.message}`);
                }
            }
        }
    }
}

module.exports = MaximoRepository