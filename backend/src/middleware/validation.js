/**
 * Validation Middleware
 * Request validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: formattedErrors,
            code: 'VALIDATION_ERROR'
        });
    }
    
    next();
};

/**
 * User validation rules
 */
const validateUser = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
        .withMessage('Password must contain at least one letter and one number'),
    
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('role')
        .optional()
        .isIn(['admin', 'supervisor', 'user'])
        .withMessage('Role must be admin, supervisor, or user'),
    
    handleValidationErrors
];

/**
 * Login validation rules
 */
const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    
    handleValidationErrors
];

/**
 * Form validation rules
 */
const validateForm = [
    body('entree')
        .trim()
        .notEmpty()
        .withMessage('Entry is required')
        .isLength({ max: 100 })
        .withMessage('Entry cannot exceed 100 characters'),
    
    body('origine')
        .trim()
        .notEmpty()
        .withMessage('Origin is required')
        .isLength({ max: 100 })
        .withMessage('Origin cannot exceed 100 characters'),
    
    body('depot')
        .trim()
        .notEmpty()
        .withMessage('Depot is required')
        .isLength({ max: 100 })
        .withMessage('Depot cannot exceed 100 characters'),
    
    body('chantier')
        .trim()
        .notEmpty()
        .withMessage('Construction site is required')
        .isLength({ max: 100 })
        .withMessage('Construction site cannot exceed 100 characters'),
    
    body('date')
        .isISO8601()
        .withMessage('Invalid date format')
        .custom(value => {
            const date = new Date(value);
            const now = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            
            if (date > now) {
                throw new Error('Date cannot be in the future');
            }
            
            if (date < oneYearAgo) {
                throw new Error('Date cannot be more than one year ago');
            }
            
            return true;
        }),
    
    body('stockDebut')
        .optional()
        .isFloat({ min: 0, max: 100000 })
        .withMessage('Start stock must be between 0 and 100,000'),
    
    body('stockFin')
        .optional()
        .isFloat({ min: 0, max: 100000 })
        .withMessage('End stock must be between 0 and 100,000'),
    
    body('sortieGasoil')
        .optional()
        .isFloat({ min: 0, max: 50000 })
        .withMessage('Diesel output must be between 0 and 50,000'),
    
    body('debutIndex')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Start index must be non-negative'),
    
    body('finIndex')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('End index must be non-negative'),
    
    body('vehicles')
        .isArray({ min: 1 })
        .withMessage('At least one vehicle is required'),
    
    body('vehicles.*.matricule')
        .trim()
        .notEmpty()
        .withMessage('Vehicle matricule is required')
        .isLength({ max: 20 })
        .withMessage('Matricule cannot exceed 20 characters'),
    
    body('vehicles.*.chauffeur')
        .trim()
        .notEmpty()
        .withMessage('Driver name is required')
        .isLength({ max: 100 })
        .withMessage('Driver name cannot exceed 100 characters'),
    
    body('vehicles.*.heureRevif')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Invalid time format (HH:MM)'),
    
    body('vehicles.*.quantiteLivree')
        .optional()
        .isFloat({ min: 0, max: 10000 })
        .withMessage('Quantity delivered must be between 0 and 10,000'),
    
    body('vehicles.*.lieuComptage')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Location cannot exceed 200 characters'),
    
    body('signatureResponsable')
        .notEmpty()
        .withMessage('Supervisor signature is required')
        .matches(/^data:image\/(png|jpeg|jpg);base64,/)
        .withMessage('Invalid signature format'),
    
    body('signatureChef')
        .notEmpty()
        .withMessage('Chief signature is required')
        .matches(/^data:image\/(png|jpeg|jpg);base64,/)
        .withMessage('Invalid signature format'),
    
    handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be between 1 and 1000'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
const validateObjectId = (paramName = 'id') => [
    param(paramName)
        .isMongoId()
        .withMessage(`Invalid ${paramName} format`),
    
    handleValidationErrors
];

/**
 * Date range validation
 */
const validateDateRange = [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format')
        .custom((value, { req }) => {
            if (req.query.startDate && value) {
                const startDate = new Date(req.query.startDate);
                const endDate = new Date(value);
                
                if (endDate < startDate) {
                    throw new Error('End date must be after start date');
                }
                
                const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
                if (daysDiff > 365) {
                    throw new Error('Date range cannot exceed 365 days');
                }
            }
            return true;
        }),
    
    handleValidationErrors
];

/**
 * File upload validation
 */
const validateFileUpload = [
    body('file')
        .custom((value, { req }) => {
            if (!req.file) {
                throw new Error('File is required');
            }
            
            const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedMimes.includes(req.file.mimetype)) {
                throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed');
            }
            
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (req.file.size > maxSize) {
                throw new Error('File size too large. Maximum 5MB allowed');
            }
            
            return true;
        }),
    
    handleValidationErrors
];

/**
 * Generic validation wrapper
 */
const validate = (validationRules) => {
    return [...validationRules, handleValidationErrors];
};

module.exports = {
    validate,
    handleValidationErrors,
    validateUser,
    validateLogin,
    validateForm,
    validatePagination,
    validateObjectId,
    validateDateRange,
    validateFileUpload
};