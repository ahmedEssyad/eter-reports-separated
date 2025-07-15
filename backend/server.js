/**
 * ETER Reports Backend Server
 * Main application entry point
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Load configuration
const config = require('./src/config');
const { connectDB } = require('./src/config/database');
const logger = require('./src/utils/logger');

// Import middleware
const { setupSecurity } = require('./src/middleware/security');
const { errorHandler, notFoundHandler } = require('./src/middleware/error');

// Import routes
const apiRoutes = require('./src/routes');

// Initialize Express app
const app = express();

/**
 * Create necessary directories
 */
const createDirectories = () => {
    const directories = [
        config.uploads.dir,
        config.logging.dir
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logger.debug(`Created directory: ${dir}`);
        }
    });
};

/**
 * Setup middleware
 */
const setupMiddleware = () => {
    // Security middleware
    setupSecurity(app);

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static file serving
    app.use('/uploads', express.static(config.uploads.dir));

    // Request logging
    app.use((req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.logRequest(req, res, duration);
        });
        
        next();
    });
};

/**
 * Setup routes
 */
const setupRoutes = () => {
    // API routes
    app.use('/api', apiRoutes);

    // Serve frontend in production
    if (config.isProduction) {
        const frontendPath = path.join(__dirname, '../frontend');
        if (fs.existsSync(frontendPath)) {
            app.use(express.static(frontendPath));
            
            // Serve index.html for client-side routing
            app.get('*', (req, res) => {
                res.sendFile(path.join(frontendPath, 'index.html'));
            });
        }
    }

    // 404 handler for API routes
    app.use('/api/*', notFoundHandler);
    
    // Global error handler
    app.use(errorHandler);
};

/**
 * Start the server
 */
const startServer = async () => {
    try {
        // Create required directories
        createDirectories();

        // Connect to database
        await connectDB();

        // Setup middleware and routes
        setupMiddleware();
        setupRoutes();

        // Start listening
        const server = app.listen(config.server.port, config.server.host, () => {
            logger.info(`ETER Reports server started`, {
                port: config.server.port,
                host: config.server.host,
                env: config.env,
                pid: process.pid
            });

            if (config.isDevelopment) {
                console.log(`\n🚀 Server running at http://${config.server.host}:${config.server.port}`);
                console.log(`📊 API available at http://${config.server.host}:${config.server.port}/api`);
                console.log(`🏥 Health check at http://${config.server.host}:${config.server.port}/api/health\n`);
            }
        });

        // Graceful shutdown
        const gracefulShutdown = (signal) => {
            logger.info(`${signal} received, shutting down gracefully`);
            
            server.close(async (err) => {
                if (err) {
                    logger.error('Error during server shutdown:', err);
                    process.exit(1);
                }

                logger.info('HTTP server closed');
                
                // Close database connection
                try {
                    const mongoose = require('mongoose');
                    await mongoose.connection.close();
                    logger.info('Database connection closed');
                } catch (dbErr) {
                    logger.error('Error closing database connection:', dbErr);
                }

                process.exit(0);
            });
        };

        // Handle termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception:', {
                error: err.message,
                stack: err.stack
            });
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection:', {
                reason: reason,
                promise: promise
            });
            process.exit(1);
        });

        return server;

    } catch (error) {
        logger.error('Failed to start server:', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };