/**
 * Authentication Middleware
 * JWT token validation and user authorization
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
                code: 'TOKEN_MISSING'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user still exists and is active
        const user = await User.findById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive',
                code: 'USER_INACTIVE'
            });
        }

        // Add user to request object
        req.user = user;
        req.userId = user._id;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication service error',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Check if user has required role
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: roles,
                current: req.user.role
            });
        }

        next();
    };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (user && user.isActive) {
                req.user = user;
                req.userId = user._id;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

/**
 * Check if user owns resource or is admin
 */
const requireOwnershipOrAdmin = (userIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const resourceUserId = req.body[userIdField] || req.params[userIdField];
        const isOwner = resourceUserId && resourceUserId.toString() === req.userId.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied - insufficient permissions',
                code: 'ACCESS_DENIED'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth,
    requireOwnershipOrAdmin
};