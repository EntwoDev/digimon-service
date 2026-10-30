const mssql = require('mssql');
const oracledb = require('oracledb');
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
require('dotenv').config();

if (process.env.OS_SERVER === 'mac') {
    const libDir = process.env.ORACLE_CLIENT_DIR || '/Users/mac/instantclient_19_16';
    try {
        oracledb.initOracleClient({ libDir });
        logger.info(`Oracle Client initialized for macOS: ${libDir}`);
    } catch (e) {
        logger.warn(`Oracle Client init warning: ${e.message}`);
    }
} else if (process.env.OS_SERVER === 'linux') {
    const libDir = process.env.ORACLE_CLIENT_DIR || '/opt/oracle/instantclient_23_7';
    try {
        oracledb.initOracleClient({ libDir });
        logger.info(`Oracle Client initialized for Linux: ${libDir}`);
    } catch (e) {
        logger.warn(`Oracle Client init warning: ${e.message}`);
    }
}

// MSSQL Configuration
const mssqlConfig = {
    user: process.env.DB_SQLSRV_USER,
    password: process.env.DB_SQLSRV_PASSWORD,
    server: process.env.DB_SQLSRV_HOST || 'localhost',
    database: process.env.DB_SQLSRV_DATABASE,
    port: parseInt(process.env.DB_SQLSRV_PORT || '1433', 10),
    pool: {
        max: parseInt(process.env.DB_SQLSRV_POOL_MAX || '10', 10),
        min: parseInt(process.env.DB_SQLSRV_POOL_MIN || '2', 10),
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

// Oracle Configuration
const oracleConfig = {
    user: process.env.DB_ORA_USER,
    password: process.env.DB_ORA_PASSWORD,
    connectString: process.env.DB_ORA_CONNECTION_STRING,
    poolMin: parseInt(process.env.DB_ORA_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_ORA_POOL_MAX || '10', 10),
    poolIncrement: 1,
    poolTimeout: 60,
};

// MySQL Configuration
const mysqlConfig = {
    host: process.env.DB_MYSQL_HOST || 'localhost',
    user: process.env.DB_MYSQL_USER,
    password: process.env.DB_MYSQL_PASSWORD,
    database: process.env.DB_MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

// MSSQL Connection Pool
let mssqlPool;
async function mssqlDB() {
    if (!mssqlPool) {
        try {
            mssqlPool = await mssql.connect(mssqlConfig);
            logger.info('MSSQL Pool connected successfully');
        } catch (err) {
            logger.error(`MSSQL Connection Error: ${err.message}`, { stack: err.stack });
            throw err;
        }
    }
    return mssqlPool;
}

// Oracle Connection Pool
let oraclePool;
async function oracleDB() {
    if (!oraclePool) {
        try {
            oraclePool = await oracledb.createPool(oracleConfig);
            logger.info('Oracle Pool connected successfully');
        } catch (err) {
            logger.error(`Oracle Connection Error: ${err.message}`, { stack: err.stack });
            throw err;
        }
    }
    return oraclePool;
}

// MySQL Pool
let mysqlPool;
async function mysqlDB() {
    if (!mysqlPool) {
        try {
            mysqlPool = await mysql.createPool(mysqlConfig);
            logger.info('MySQL Pool connected successfully');
        } catch (err) {
            logger.error(`MySQL Connection Error: ${err.message}`, { stack: err.stack });
            throw err;
        }
    }
    return mysqlPool;
}

module.exports = {
    mssqlDB,
    oracleDB,
    mysqlDB,
};
