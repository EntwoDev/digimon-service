const mssql = require('mssql');
const oracledb = require('oracledb');
const mysql = require('mysql2/promise');
require('dotenv').config();

if(process.env.OS_SERVER === 'mac') {
    oracledb.initOracleClient({
        libDir: '/Users/mac/instantclient_19_16'  // path lokasi Instant Client kamu
    });
}else if(process.env.OS_SERVER === 'linux') {
    oracledb.initOracleClient({ libDir: '/opt/oracle/instantclient_23_7' });
}

// MSSQL Configuration
const mssqlConfig = {
    user: process.env.DB_SQLSRV_USER || 'your_sql_user',
    password: process.env.DB_SQLSRV_PASSWORD || 'your_sql_password',
    server: process.env.DB_SQLSRV_HOST || 'localhost',
    database: process.env.DB_SQLSRV_DATABASE || 'your_sql_db',
    port: parseInt(process.env.DB_SQLSRV_PORT || 1433),
    pool: {
        max: 10,      // Max connections in the pool
        min: 2,       // Min connections in the pool
        idleTimeoutMillis: 30000 // Timeout for idle connections
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Oracle Configuration
const oracleConfig = {
    user: process.env.DB_ORA_USER || 'your_oracle_user',
    password: process.env.DB_ORA_PASSWORD || 'your_oracle_password',
    connectString: process.env.DB_ORA_CONNECTION_STRING || 'localhost/XEPDB1',
    poolMin: 2,          // Minimum connections in the pool
    poolMax: 10,         // Maximum connections in the pool
    poolIncrement: 1,    // Increment for new connections in the pool
    poolTimeout: 60,     // Timeout for acquiring a connection from the pool
};

// MySQL Configuration
const mysqlConfig = {
    host: process.env.DB_MYSQL_HOST || 'localhost',
    user: process.env.DB_MYSQL_USER || 'your_mysql_user',
    password: process.env.DB_MYSQL_PASSWORD || 'your_mysql_password',
    database: process.env.DB_MYSQL_DATABASE || 'your_mysql_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};


// MSSQL Connection Pool
let mssqlPool;
async function mssqlDB() {
    if (!mssqlPool) {
        try {
            mssqlPool = await mssql.connect(mssqlConfig);
            console.log('MSSQL Pool connected');
        } catch (err) {
            console.error('MSSQL Connection Error:', err);
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
            console.log('Oracle Pool connected');
        } catch (err) {
            console.error('Oracle Connection Error:', err);
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
            console.log('MySQL Pool connected');
        } catch (err) {
            console.error('MySQL Connection Error:', err);
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