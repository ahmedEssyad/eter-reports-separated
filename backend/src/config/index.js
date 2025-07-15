/**
 * Configuration Index
 * Central configuration management
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || 'localhost',
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },

    // Database configuration
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/eter-reports',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        }
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'eter-reports-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },

    // Environment
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        dir: path.join(__dirname, '../../logs')
    },

    // File uploads
    uploads: {
        dir: path.join(__dirname, '../../uploads'),
        maxSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/png', 'image/jpeg', 'image/jpg']
    },

    // Security
    security: {
        rateLimiting: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100 // requests per window
        },
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },

    // PDF generation
    pdf: {
        maxReportsPerBatch: parseInt(process.env.MAX_REPORTS_PER_BATCH) || 50,
        maxDateRangeDays: parseInt(process.env.MAX_DATE_RANGE_DAYS) || 365
    }
};

// Validate required configuration
const requiredConfig = [
    'server.port',
    'jwt.secret',
    'database.uri'
];

const validateConfig = () => {
    const missing = [];
    
    requiredConfig.forEach(key => {
        const value = key.split('.').reduce((obj, prop) => obj?.[prop], config);
        if (!value) {
            missing.push(key);
        }
    });

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Warn about default values in production
    if (config.isProduction) {
        if (config.jwt.secret === 'eter-reports-secret-key-change-in-production') {
            console.warn('WARNING: Using default JWT secret in production!');
        }
    }
};

// Validate configuration on load
validateConfig();

module.exports = config;