/**
 * Routes Index
 * Central router configuration
 */

const express = require('express');
const authRoutes = require('./auth');
const formRoutes = require('./forms');
const pdfRoutes = require('./pdf');
const { APIError } = require('../middleware/error');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'ETER Reports API is running',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
router.use('/auth', authRoutes);
router.use('/forms', formRoutes);
router.use('/pdf', pdfRoutes);

// Catch-all for undefined API routes
router.use('*', (req, res, next) => {
    next(new APIError(
        `API endpoint ${req.originalUrl} not found`,
        404,
        'ENDPOINT_NOT_FOUND'
    ));
});

module.exports = router;