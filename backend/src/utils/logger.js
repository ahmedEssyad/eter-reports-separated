/**
 * Logger Utility
 * Winston-based logging configuration
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define log colors
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(info => {
        const { timestamp, level, message, stack, ...meta } = info;
        
        let log = `${timestamp} [${level}]: ${message}`;
        
        // Add stack trace for errors
        if (stack) {
            log += `\n${stack}`;
        }
        
        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            log += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
        }
        
        return log;
    })
);

// Define which transports to use based on environment
const transports = [
    // Console transport
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'debug',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    })
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    const logsDir = path.join(__dirname, '../../logs');
    
    // Ensure logs directory exists
    const fs = require('fs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Error log file
    transports.push(
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
    
    // Combined log file
    transports.push(
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
    
    // HTTP requests log
    transports.push(
        new winston.transports.File({
            filename: path.join(logsDir, 'access.log'),
            level: 'http',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            maxsize: 5242880, // 5MB
            maxFiles: 3
        })
    );
}

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    levels,
    format,
    transports,
    exitOnError: false
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Helper methods for structured logging
logger.logRequest = (req, res, responseTime) => {
    logger.http('HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user ? req.user._id : null
    });
};

logger.logError = (error, req = null, additionalInfo = {}) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        ...additionalInfo
    };
    
    if (req) {
        errorInfo.request = {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user ? req.user._id : null
        };
    }
    
    logger.error('Application Error', errorInfo);
};

logger.logAuth = (action, user, req, success = true, details = {}) => {
    const level = success ? 'info' : 'warn';
    
    logger[level](`Auth ${action}`, {
        action,
        success,
        user: typeof user === 'string' ? user : user?.username,
        userId: typeof user === 'object' ? user?._id : null,
        ip: req?.ip,
        userAgent: req?.get('User-Agent'),
        ...details
    });
};

logger.logDatabase = (operation, collection, details = {}) => {
    logger.debug(`Database ${operation}`, {
        operation,
        collection,
        ...details
    });
};

logger.logSecurity = (event, details = {}) => {
    logger.warn(`Security Event: ${event}`, details);
};

logger.logPerformance = (operation, duration, details = {}) => {
    const level = duration > 1000 ? 'warn' : 'debug';
    
    logger[level](`Performance: ${operation}`, {
        operation,
        duration: `${duration}ms`,
        ...details
    });
};

// Export different log levels as separate methods for convenience
module.exports = {
    error: logger.error.bind(logger),
    warn: logger.warn.bind(logger),
    info: logger.info.bind(logger),
    http: logger.http.bind(logger),
    debug: logger.debug.bind(logger),
    
    // Helper methods
    logRequest: logger.logRequest,
    logError: logger.logError,
    logAuth: logger.logAuth,
    logDatabase: logger.logDatabase,
    logSecurity: logger.logSecurity,
    logPerformance: logger.logPerformance,
    
    // Stream for Morgan
    stream: logger.stream,
    
    // Raw logger instance
    logger
};