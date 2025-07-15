/**
 * PDF Routes
 * Handles PDF generation endpoints
 */

const express = require('express');
const { query, body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
    generateSingleReportPDF,
    generateMultipleReportsPDF,
    generateDateRangeReportsPDF,
    generateSummaryReportPDF
} = require('../services/pdfService');
const logger = require('../utils/logger');
const { APIError, asyncHandler } = require('../middleware/error');

const router = express.Router();

// All PDF routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

/**
 * Generate single report PDF
 */
router.get('/report/:id',
    validate([
        body('id')
            .trim()
            .notEmpty()
            .withMessage('Form ID is required')
    ]),
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        try {
            const { doc, form } = await generateSingleReportPDF(id);

            const filename = `rapport_${form.id}_${new Date().toISOString().split('T')[0]}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            logger.info(`PDF generated for form: ${form.id}`, {
                formId: form.id,
                generatedBy: req.user.username,
                type: 'single_report'
            });

            doc.pipe(res);
            doc.end();

        } catch (error) {
            logger.error('Error generating single report PDF', {
                formId: id,
                error: error.message,
                userId: req.user._id
            });
            throw error;
        }
    })
);

/**
 * Generate multiple reports PDF
 */
router.post('/reports/multiple',
    validate([
        body('formIds')
            .isArray({ min: 1, max: 50 })
            .withMessage('Form IDs array is required with 1-50 IDs'),
        body('formIds.*')
            .trim()
            .notEmpty()
            .withMessage('Each form ID must be a non-empty string')
    ]),
    asyncHandler(async (req, res) => {
        const { formIds } = req.body;

        try {
            const { doc, forms } = await generateMultipleReportsPDF(formIds);

            const filename = `rapports_multiples_${new Date().toISOString().split('T')[0]}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            logger.info(`Multiple reports PDF generated`, {
                formCount: forms.length,
                formIds: formIds.slice(0, 5), // Log first 5 IDs only
                generatedBy: req.user.username,
                type: 'multiple_reports'
            });

            doc.pipe(res);
            doc.end();

        } catch (error) {
            logger.error('Error generating multiple reports PDF', {
                formIds: formIds.slice(0, 5),
                error: error.message,
                userId: req.user._id
            });
            throw error;
        }
    })
);

/**
 * Generate date range reports PDF
 */
router.get('/reports/date-range',
    validate([
        query('startDate')
            .notEmpty()
            .isISO8601()
            .withMessage('Start date is required and must be a valid ISO 8601 date'),
        query('endDate')
            .notEmpty()
            .isISO8601()
            .withMessage('End date is required and must be a valid ISO 8601 date'),
        query('depot')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Depot filter must not exceed 100 characters'),
        query('status')
            .optional()
            .isIn(['pending', 'approved', 'rejected'])
            .withMessage('Status must be pending, approved, or rejected')
    ]),
    asyncHandler(async (req, res) => {
        const { startDate, endDate, depot, status } = req.query;

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start >= end) {
            throw new APIError('Start date must be before end date', 400, 'INVALID_DATE_RANGE');
        }

        // Limit date range to prevent excessive queries
        const maxDays = 365;
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
        
        if (daysDiff > maxDays) {
            throw new APIError(`Date range cannot exceed ${maxDays} days`, 400, 'DATE_RANGE_TOO_LARGE');
        }

        const filters = {};
        if (depot) filters.depot = depot;
        if (status) filters.status = status;

        try {
            const { doc, forms } = await generateDateRangeReportsPDF(startDate, endDate, filters);

            const filename = `rapports_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            logger.info(`Date range reports PDF generated`, {
                startDate,
                endDate,
                formCount: forms.length,
                filters,
                generatedBy: req.user.username,
                type: 'date_range_reports'
            });

            doc.pipe(res);
            doc.end();

        } catch (error) {
            logger.error('Error generating date range reports PDF', {
                startDate,
                endDate,
                filters,
                error: error.message,
                userId: req.user._id
            });
            throw error;
        }
    })
);

/**
 * Generate summary report PDF
 */
router.get('/summary',
    validate([
        query('startDate')
            .notEmpty()
            .isISO8601()
            .withMessage('Start date is required and must be a valid ISO 8601 date'),
        query('endDate')
            .notEmpty()
            .isISO8601()
            .withMessage('End date is required and must be a valid ISO 8601 date'),
        query('depot')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Depot filter must not exceed 100 characters'),
        query('status')
            .optional()
            .isIn(['pending', 'approved', 'rejected'])
            .withMessage('Status must be pending, approved, or rejected')
    ]),
    asyncHandler(async (req, res) => {
        const { startDate, endDate, depot, status } = req.query;

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (start >= end) {
            throw new APIError('Start date must be before end date', 400, 'INVALID_DATE_RANGE');
        }

        const filters = {};
        if (depot) filters.depot = depot;
        if (status) filters.status = status;

        try {
            const { doc, statistics } = await generateSummaryReportPDF(startDate, endDate, filters);

            const filename = `synthese_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            logger.info(`Summary report PDF generated`, {
                startDate,
                endDate,
                statistics,
                filters,
                generatedBy: req.user.username,
                type: 'summary_report'
            });

            doc.pipe(res);
            doc.end();

        } catch (error) {
            logger.error('Error generating summary report PDF', {
                startDate,
                endDate,
                filters,
                error: error.message,
                userId: req.user._id
            });
            throw error;
        }
    })
);

module.exports = router;