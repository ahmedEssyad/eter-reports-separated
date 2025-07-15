/**
 * Forms Routes
 * Handles all form-related endpoints
 */

const express = require('express');
const { body, query } = require('express-validator');
const {
    submitForm,
    getAllForms,
    getFormById,
    updateFormStatus,
    deleteForm,
    getFormStatistics,
    getFormsByDateRange,
    bulkUpdateForms
} = require('../controllers/formController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Public route for form submission
router.post('/submit',
    validate([
        body('entree')
            .trim()
            .notEmpty()
            .withMessage('Entry field is required')
            .isLength({ max: 100 })
            .withMessage('Entry must not exceed 100 characters'),
        body('origine')
            .trim()
            .notEmpty()
            .withMessage('Origin field is required')
            .isLength({ max: 100 })
            .withMessage('Origin must not exceed 100 characters'),
        body('depot')
            .trim()
            .notEmpty()
            .withMessage('Depot field is required')
            .isLength({ max: 100 })
            .withMessage('Depot must not exceed 100 characters'),
        body('chantier')
            .trim()
            .notEmpty()
            .withMessage('Chantier field is required')
            .isLength({ max: 100 })
            .withMessage('Chantier must not exceed 100 characters'),
        body('date')
            .isISO8601()
            .withMessage('Date must be a valid ISO 8601 date'),
        body('stockDebut')
            .optional()
            .isNumeric()
            .withMessage('Stock debut must be a number'),
        body('stockFin')
            .optional()
            .isNumeric()
            .withMessage('Stock fin must be a number'),
        body('sortieGasoil')
            .optional()
            .isNumeric()
            .withMessage('Sortie gasoil must be a number'),
        body('debutIndex')
            .optional()
            .isNumeric()
            .withMessage('Debut index must be a number'),
        body('finIndex')
            .optional()
            .isNumeric()
            .withMessage('Fin index must be a number'),
        body('vehicles')
            .isArray({ min: 1 })
            .withMessage('At least one vehicle is required'),
        body('vehicles.*.matricule')
            .trim()
            .notEmpty()
            .withMessage('Vehicle matricule is required')
            .isLength({ max: 20 })
            .withMessage('Matricule must not exceed 20 characters'),
        body('vehicles.*.chauffeur')
            .trim()
            .notEmpty()
            .withMessage('Driver name is required')
            .isLength({ max: 100 })
            .withMessage('Driver name must not exceed 100 characters'),
        body('vehicles.*.heureRevif')
            .optional()
            .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .withMessage('Heure revif must be in HH:MM format'),
        body('vehicles.*.quantiteLivree')
            .isNumeric()
            .withMessage('Quantite livree must be a number')
            .custom(value => value >= 0)
            .withMessage('Quantite livree must be positive'),
        body('vehicles.*.lieuComptage')
            .optional()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Lieu comptage must not exceed 100 characters'),
        body('signatureResponsable')
            .notEmpty()
            .withMessage('Supervisor signature is required')
            .matches(/^data:image\/(png|jpeg|jpg);base64,/)
            .withMessage('Supervisor signature must be a valid base64 image'),
        body('signatureChef')
            .notEmpty()
            .withMessage('Chief signature is required')
            .matches(/^data:image\/(png|jpeg|jpg);base64,/)
            .withMessage('Chief signature must be a valid base64 image'),
        body('notes')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Notes must not exceed 500 characters')
    ]),
    submitForm
);

// Protected routes - require authentication
router.use(authenticate);

// Admin routes
router.use(authorize(['admin']));

router.get('/',
    validate([
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('status')
            .optional()
            .isIn(['pending', 'approved', 'rejected'])
            .withMessage('Status must be pending, approved, or rejected'),
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be a valid ISO 8601 date'),
        query('depot')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Depot filter must not exceed 100 characters'),
        query('search')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Search term must not exceed 100 characters')
    ]),
    getAllForms
);

router.get('/statistics',
    validate([
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Start date must be a valid ISO 8601 date'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be a valid ISO 8601 date'),
        query('depot')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Depot filter must not exceed 100 characters')
    ]),
    getFormStatistics
);

router.get('/date-range',
    validate([
        query('startDate')
            .notEmpty()
            .isISO8601()
            .withMessage('Start date is required and must be a valid ISO 8601 date'),
        query('endDate')
            .notEmpty()
            .isISO8601()
            .withMessage('End date is required and must be a valid ISO 8601 date'),
        query('status')
            .optional()
            .isIn(['pending', 'approved', 'rejected'])
            .withMessage('Status must be pending, approved, or rejected'),
        query('depot')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Depot filter must not exceed 100 characters')
    ]),
    getFormsByDateRange
);

router.get('/:id',
    validate([
        body('id')
            .trim()
            .notEmpty()
            .withMessage('Form ID is required')
    ]),
    getFormById
);

router.put('/:id/status',
    validate([
        body('status')
            .isIn(['pending', 'approved', 'rejected'])
            .withMessage('Status must be pending, approved, or rejected'),
        body('notes')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Notes must not exceed 500 characters')
    ]),
    updateFormStatus
);

router.put('/bulk',
    validate([
        body('formIds')
            .isArray({ min: 1 })
            .withMessage('Form IDs array is required with at least one ID'),
        body('formIds.*')
            .trim()
            .notEmpty()
            .withMessage('Each form ID must be a non-empty string'),
        body('updates.status')
            .optional()
            .isIn(['pending', 'approved', 'rejected'])
            .withMessage('Status must be pending, approved, or rejected'),
        body('updates.notes')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Notes must not exceed 500 characters')
    ]),
    bulkUpdateForms
);

router.delete('/:id', deleteForm);

module.exports = router;