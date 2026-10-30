const path = require('path');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

// Path log di-resolve absolut terhadap root project, bukan working directory
// supaya log tetap konsisten walau service dijalankan dari direktori lain.
const LOG_DIR = process.env.LOG_DIR
    ? path.resolve(process.env.LOG_DIR)
    : path.resolve(__dirname, '../log');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '20m';
const LOG_MAX_FILES = process.env.LOG_MAX_FILES || '14d';

const lineFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaKeys = Object.keys(meta).filter((k) => typeof meta[k] !== 'symbol');
        const metaStr = metaKeys.length
            ? ` ${JSON.stringify(metaKeys.reduce((acc, k) => ({ ...acc, [k]: meta[k] }), {}))}`
            : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}${metaStr}`;
    })
);

const rotateOptions = {
    dirname: LOG_DIR,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: LOG_MAX_SIZE,
    maxFiles: LOG_MAX_FILES,
};

const logger = createLogger({
    level: LOG_LEVEL,
    format: lineFormat,
    transports: [
        new transports.Console(),
        new transports.DailyRotateFile({
            ...rotateOptions,
            filename: 'error-%DATE%.log',
            level: 'error',
        }),
        new transports.DailyRotateFile({
            ...rotateOptions,
            filename: 'combined-%DATE%.log',
        }),
    ],
});

/**
 * Log error yang berulang (mis. loop SSE 1 detik) tanpa membanjiri disk.
 * Pesan identik hanya ditulis sekali per window, sisanya diringkas jadi
 * satu baris berisi jumlah kejadian yang ditekan.
 */
const THROTTLE_WINDOW_MS = parseInt(process.env.LOG_THROTTLE_MS || '60000', 10);
const throttleState = new Map();

logger.throttledError = (key, message, meta = {}) => {
    const now = Date.now();
    const state = throttleState.get(key);

    if (!state || now - state.firstSeen >= THROTTLE_WINDOW_MS) {
        if (state && state.suppressed > 0) {
            logger.warn(
                `Suppressed ${state.suppressed} duplicate error(s) for "${key}" in the last ${Math.round(
                    (now - state.firstSeen) / 1000
                )}s`
            );
        }
        throttleState.set(key, { firstSeen: now, suppressed: 0, lastMessage: message });
        logger.error(message, meta);
        return;
    }

    state.suppressed += 1;
    state.lastMessage = message;
};

logger.logDir = LOG_DIR;

module.exports = logger;
