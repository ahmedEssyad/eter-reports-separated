/**
 * Database Configuration
 * MongoDB connection and configuration
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eter-reports';
        
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            retryWrites: true,
            w: 'majority'
        };

        const conn = await mongoose.connect(mongoURI, options);

        logger.info(`MongoDB Connected: ${conn.connection.host}`, {
            database: conn.connection.name,
            host: conn.connection.host,
            port: conn.connection.port
        });

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                logger.error('Error during MongoDB disconnection:', err);
                process.exit(1);
            }
        });

        return conn;

    } catch (error) {
        logger.error('Database connection failed:', {
            error: error.message,
            stack: error.stack
        });

        // In development, continue without database (use memory storage)
        if (process.env.NODE_ENV === 'development') {
            logger.warn('Running in development mode without database connection');
            return null;
        }

        // In production, exit the process
        process.exit(1);
    }
};

/**
 * Close database connection
 */
const closeDB = async () => {
    try {
        await mongoose.connection.close();
        logger.info('Database connection closed');
    } catch (error) {
        logger.error('Error closing database connection:', error);
    }
};

module.exports = {
    connectDB,
    closeDB
};