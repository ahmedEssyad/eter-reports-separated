/**
 * Security Middleware
 * Request security, rate limiting, and protection
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

/**
 * General rate limiter
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many requests from this IP, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * Strict rate limiter for auth endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * API rate limiter for form submissions
 */
const formSubmissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 form submissions per hour
    message: {
        success: false,
        message: 'Too many form submissions, please try again later.',
        code: 'FORM_SUBMISSION_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Configure helmet for security headers
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            scriptSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: [
                "'self'",
                "https://cdnjs.cloudflare.com"
            ],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false, // Needed for some integrations
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

/**
 * Request size limiter
 */
const requestSizeLimiter = (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length'));
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (contentLength && contentLength > maxSize) {
        return res.status(413).json({
            success: false,
            message: 'Request entity too large',
            code: 'REQUEST_TOO_LARGE',
            maxSize: '50MB'
        });
    }

    next();
};

/**
 * IP whitelist middleware (for admin endpoints)
 */
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        if (allowedIPs.length === 0) {
            return next(); // No restriction if no IPs specified
        }

        const clientIP = req.ip || req.connection.remoteAddress;
        const isAllowed = allowedIPs.some(ip => {
            if (ip.includes('/')) {
                // CIDR notation support would go here
                return false;
            }
            return ip === clientIP;
        });

        if (!isAllowed) {
            return res.status(403).json({
                success: false,
                message: 'Access denied from this IP address',
                code: 'IP_NOT_ALLOWED'
            });
        }

        next();
    };
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    
    // Log response time on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
};

/**
 * Sanitize request data
 */
const sanitizeRequest = (req, res, next) => {
    // Remove potentially dangerous characters from query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].replace(/[<>]/g, '');
            }
        });
    }

    // Remove potentially dangerous characters from request body
    if (req.body && typeof req.body === 'object') {
        const sanitizeObject = (obj) => {
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'string') {
                    // Don't sanitize signature data
                    if (!key.toLowerCase().includes('signature')) {
                        obj[key] = obj[key].replace(/[<>]/g, '');
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            });
        };
        sanitizeObject(req.body);
    }

    next();
};

/**
 * CORS configuration
 */
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000'
        ].filter(Boolean);

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    next();
};

module.exports = {
    generalLimiter,
    authLimiter,
    formSubmissionLimiter,
    helmetConfig,
    requestSizeLimiter,
    ipWhitelist,
    requestLogger,
    sanitizeRequest,
    corsOptions,
    securityHeaders,
    compression: compression()
};