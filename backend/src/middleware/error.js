/**
 * Error Handling Middleware
 * Centralized error handling and logging
 */

const logger = require('../utils/logger');

/**
 * Custom error class for API errors
 */
class APIError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Not found middleware
 */
const notFound = (req, res, next) => {
    const error = new APIError(
        `Route ${req.originalUrl} not found`,
        404,
        'ROUTE_NOT_FOUND'
    );
    next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        user: req.user ? req.user._id : 'anonymous'
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new APIError(message, 404, 'RESOURCE_NOT_FOUND');
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate value for ${field}`;
        error = new APIError(message, 400, 'DUPLICATE_FIELD', {
            field,
            value: err.keyValue[field]
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(val => ({
            field: val.path,
            message: val.message,
            value: val.value
        }));
        
        error = new APIError(
            'Validation failed',
            400,
            'VALIDATION_ERROR',
            errors
        );
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new APIError('Invalid token', 401, 'INVALID_TOKEN');
    }

    if (err.name === 'TokenExpiredError') {
        error = new APIError('Token expired', 401, 'TOKEN_EXPIRED');
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        error = new APIError('File too large', 400, 'FILE_TOO_LARGE');
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error = new APIError('Unexpected file field', 400, 'UNEXPECTED_FILE');
    }

    // MongoDB connection errors
    if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
        error = new APIError(
            'Database connection error',
            503,
            'DATABASE_ERROR'
        );
    }

    // Rate limiting errors
    if (err.status === 429) {
        error = new APIError(
            'Too many requests, please try again later',
            429,
            'RATE_LIMIT_EXCEEDED'
        );
    }

    // Default to 500 server error
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';
    const message = error.message || 'Internal server error';

    const response = {
        success: false,
        message,
        code,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            originalError: err.name 
        })
    };

    res.status(statusCode).json(response);
};

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
    process.on('unhandledRejection', (err, promise) => {
        logger.error('Unhandled Promise Rejection:', err);
        console.log('Shutting down the server due to Unhandled Promise rejection');
        
        // Close server & exit process
        process.exit(1);
    });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception:', err);
        console.log('Shutting down the server due to Uncaught Exception');
        
        // Close server & exit process
        process.exit(1);
    });
};

/**
 * Graceful shutdown handler
 */
const handleGracefulShutdown = (server) => {
    const shutdown = (signal) => {
        logger.info(`Received ${signal}. Graceful shutdown...`);
        
        server.close(() => {
            logger.info('HTTP server closed.');
            process.exit(0);
        });
        
        // Force close after 30 seconds
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

module.exports = {
    APIError,
    notFound,
    errorHandler,
    asyncHandler,
    handleUnhandledRejection,
    handleUncaughtException,
    handleGracefulShutdown
};