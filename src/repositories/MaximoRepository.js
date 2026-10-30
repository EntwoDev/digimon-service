const oracledb = require('oracledb');
const { oracleDB } = require("../config/database");
const logger = require("../utils/logger");

class MaximoRepository {
    async loadDaily() {
        let connection;
        try {
            const pool = await oracleDB();
            connection = await pool.getConnection();

            const result = await connection.execute(
                `
                SELECT *
                FROM (
                    SELECT
                        TANGGAL,
                        CASE WHEN TO_CHAR(AFAU3) IS NULL THEN '0' ELSE TO_CHAR(AFAU3) END AS AFA3,
                        CASE WHEN TO_CHAR(TARGETAFAU3) IS NULL THEN '0' ELSE TO_CHAR(TARGETAFAU3) END AS TARGETAFAU3,
                        CASE WHEN TO_CHAR(U3NCF) IS NULL THEN '0' ELSE TO_CHAR(U3NCF) END AS U3NCF,
                        CASE WHEN TO_CHAR(TARGETCFU3) IS NULL THEN '0' ELSE TO_CHAR(TARGETCFU3) END AS TARGETCFU3,
                        CASE WHEN TO_CHAR(TARGETNETPRODU3) IS NULL THEN '0' ELSE TO_CHAR(TARGETNETPRODU3) END AS TARGETNETPRODU3,
                        CASE WHEN TO_CHAR(NPHR3) IS NULL THEN '0' ELSE TO_CHAR(NPHR3) END AS NPHR3,
                        CASE WHEN TO_CHAR(NETPROD3) IS NULL THEN '0' ELSE TO_CHAR(NETPROD3) END AS NETPROD3,
                        CASE WHEN TO_CHAR(TARGETNPHRU3) IS NULL THEN '0' ELSE TO_CHAR(TARGETNPHRU3) END AS TARGETNPHRU3,
                        CASE WHEN TO_CHAR(EFORKPIU3) IS NULL THEN '0' ELSE TO_CHAR(EFORKPIU3) END AS EFORKPIU3,
                        CASE WHEN TO_CHAR(TOTALNETTOU3) IS NULL THEN '0' ELSE TO_CHAR(TOTALNETTOU3) END AS TOTALNETTOU3,
                        REGU
                    FROM MAXIMO.OMLAPORAN
                    WHERE TANGGAL IS NOT NULL
                    AND NETPROD3 IS NOT NULL
                    ORDER BY TANGGAL DESC
                )
                WHERE ROWNUM <= 1
                `,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return result.rows.length ? result.rows : null;

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
            const result = await connection.execute(`SELECT F3.*
		FROM (
			SELECT F2.*
			FROM (
				SELECT F1.*
				FROM (
					SELECT
		OMLAPORAN.NETPROD3, CASE
		WHEN OMLAPORAN.NPHR3='0' THEN NULL ELSE TO_CHAR(OMLAPORAN.U3NCF) 
		END AS U3NCF, OMLAPORAN.TARGETNPHRU3, OMLAPORAN.TANGGAL,
					CASE
		WHEN OMLAPORAN.NPHR3='0' THEN NULL ELSE OMLAPORAN.NPHR3
		END AS NPHR3,
		CASE
		WHEN OMLAPORAN.TARGETCFU3='0' THEN NULL ELSE OMLAPORAN.TARGETCFU3
		END AS TARGETCFU3,
		CASE
		WHEN OMLAPORAN.TARGETNETPRODU3='0' THEN NULL ELSE
		OMLAPORAN.TARGETNETPRODU3 
		END AS TARGETNETPRODU3
		FROM MAXIMO.OMLAPORAN
					WHERE TANGGAL IS NOT NULL
					ORDER BY TANGGAL DESC
				) F1
				WHERE ROWNUM <=4
			) F2
		) F3
		`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
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

            const result = await connection.execute(
                `
                SELECT *
                FROM (
                    SELECT
                        TARGETNPHRU3,
                        NPHR3,
                        TOTALNETTOU3,
                        AFAU3,
                        TARGETAFAU3,
                        NETPROD3,
                        TANGGAL,
                        TO_CHAR(EFORKPIU3, '9990.99') AS EFORKPIU3,
                        1 + TRUNC(LAST_DAY(TANGGAL)) - TRUNC(TANGGAL,'MM') AS JUMLAHHARI,
                        (
                            SELECT AVG(NPHR3)
                            FROM MAXIMO.OMLAPORAN
                            WHERE TANGGAL IS NOT NULL
                            AND TO_CHAR(TANGGAL,'MM') = :month
                            AND TO_CHAR(TANGGAL,'YYYY') = TO_CHAR(SYSDATE - 1,'YYYY')
                        ) AS TARGETNPHR
                    FROM MAXIMO.OMLAPORAN
                    WHERE TANGGAL IS NOT NULL
                    AND TO_CHAR(TANGGAL,'YYYY') = TO_CHAR(SYSDATE,'YYYY')
                    AND TO_CHAR(TANGGAL,'MM') = :month
                    AND NPHR3 <> 0
                    ORDER BY TANGGAL DESC
                )
                WHERE ROWNUM <= 1
                `,
                {
                    month: String(month).padStart(2, "0"),
                },
                {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                }
            );

            return result.rows.length ? result.rows : null;

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