/**
 * Authentication Routes
 * Handles all auth-related endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const {
    login,
    verifyToken,
    logout,
    changePassword,
    getProfile,
    updateProfile,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/login', 
    validate([
        body('username')
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters')
            .matches(/^[a-zA-Z0-9_.-]+$/)
            .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
    ]),
    login
);

// Protected routes
router.use(authenticate);

router.get('/verify', verifyToken);
router.post('/logout', logout);
router.get('/profile', getProfile);

router.put('/profile',
    validate([
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters')
    ]),
    updateProfile
);

router.put('/change-password',
    validate([
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('New password must be at least 6 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
    ]),
    changePassword
);

// Admin only routes
router.use(authorize(['admin']));

router.get('/users', getAllUsers);

router.post('/users',
    validate([
        body('username')
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters')
            .matches(/^[a-zA-Z0-9_.-]+$/)
            .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
        body('name')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('role')
            .optional()
            .isIn(['admin', 'user'])
            .withMessage('Role must be either admin or user')
    ]),
    createUser
);

router.put('/users/:id',
    validate([
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Name must be between 2 and 100 characters'),
        body('role')
            .optional()
            .isIn(['admin', 'user'])
            .withMessage('Role must be either admin or user'),
        body('isActive')
            .optional()
            .isBoolean()
            .withMessage('isActive must be a boolean value')
    ]),
    updateUser
);

router.delete('/users/:id', deleteUser);

module.exports = router;