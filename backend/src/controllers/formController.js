/**
 * Form Controller
 * Handles daily report form operations
 */

const { Form } = require('../models');
const { APIError, asyncHandler } = require('../middleware/error');
const logger = require('../utils/logger');
const { saveSignature, generateUniqueId } = require('../utils/helpers');

/**
 * Submit a new form
 */
const submitForm = asyncHandler(async (req, res) => {
    const {
        id,
        entree,
        origine,
        depot,
        chantier,
        date,
        stockDebut,
        stockFin,
        sortieGasoil,
        debutIndex,
        finIndex,
        vehicles,
        signatureResponsable,
        signatureChef,
        notes
    } = req.body;

    // Generate unique ID if not provided
    const formId = id || generateUniqueId();

    // Check if form with this ID already exists
    const existingForm = await Form.findOne({ id: formId });
    if (existingForm) {
        throw new APIError('Form with this ID already exists', 400, 'FORM_ID_EXISTS');
    }

    // Save signatures to files
    const signatureUrlResponsable = await saveSignature(signatureResponsable, `${formId}_responsable`);
    const signatureUrlChef = await saveSignature(signatureChef, `${formId}_chef`);

    if (!signatureUrlResponsable || !signatureUrlChef) {
        throw new APIError('Error saving signatures', 500, 'SIGNATURE_SAVE_ERROR');
    }

    // Create form data
    const formData = {
        id: formId,
        entree,
        origine,
        depot,
        chantier,
        date: new Date(date),
        stockDebut: Number(stockDebut) || 0,
        stockFin: Number(stockFin) || 0,
        sortieGasoil: Number(sortieGasoil) || 0,
        debutIndex: Number(debutIndex) || 0,
        finIndex: Number(finIndex) || 0,
        vehicles: vehicles.map(v => ({
            ...v,
            matricule: v.matricule.toUpperCase(),
            quantiteLivree: Number(v.quantiteLivree) || 0
        })),
        signatureResponsable,
        signatureUrlResponsable,
        signatureChef,
        signatureUrlChef,
        notes,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    };

    // Save form
    const form = new Form(formData);
    await form.save();

    logger.info(`Form submitted: ${form.id}`, {
        formId: form.id,
        depot: form.depot,
        vehicleCount: form.vehicles.length,
        totalFuel: form.totalFuelDelivered,
        ip: req.ip
    });

    res.status(201).json({
        success: true,
        message: 'Form submitted successfully',
        formId: form.id,
        data: {
            id: form.id,
            submittedAt: form.submittedAt,
            status: form.status,
            totalFuelDelivered: form.totalFuelDelivered,
            vehicleCount: form.vehicleCount
        }
    });
});

/**
 * Get all forms (Admin only)
 */
const getAllForms = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.status) {
        filter.status = req.query.status;
    }
    
    if (req.query.depot) {
        filter.depot = new RegExp(req.query.depot, 'i');
    }
    
    if (req.query.startDate && req.query.endDate) {
        filter.date = {
            $gte: new Date(req.query.startDate),
            $lte: new Date(req.query.endDate)
        };
    }

    // Search functionality
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        filter.$or = [
            { entree: searchRegex },
            { origine: searchRegex },
            { depot: searchRegex },
            { chantier: searchRegex },
            { 'vehicles.matricule': searchRegex },
            { 'vehicles.chauffeur': searchRegex }
        ];
    }

    // Execute query
    const [forms, total] = await Promise.all([
        Form.find(filter)
            .select('-signatureResponsable -signatureChef') // Exclude large signature data
            .sort({ submittedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Form.countDocuments(filter)
    ]);

    res.json({
        success: true,
        forms,
        pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: forms.length,
            totalRecords: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        },
        filters: {
            status: req.query.status,
            depot: req.query.depot,
            dateRange: req.query.startDate && req.query.endDate ? {
                start: req.query.startDate,
                end: req.query.endDate
            } : null,
            search: req.query.search
        }
    });
});

/**
 * Get form by ID
 */
const getFormById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const form = await Form.findOne({ id }).lean();
    
    if (!form) {
        throw new APIError('Form not found', 404, 'FORM_NOT_FOUND');
    }

    res.json({
        success: true,
        form
    });
});

/**
 * Update form status (Admin only)
 */
const updateFormStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const form = await Form.findOne({ id });
    
    if (!form) {
        throw new APIError('Form not found', 404, 'FORM_NOT_FOUND');
    }

    // Update status
    form.status = status;
    if (notes) {
        form.notes = notes;
    }

    if (status === 'approved') {
        form.approvedAt = new Date();
        form.approvedBy = req.userId;
    }

    await form.save();

    logger.info(`Form status updated: ${form.id}`, {
        formId: form.id,
        oldStatus: form.status,
        newStatus: status,
        updatedBy: req.user.username,
        notes
    });

    res.json({
        success: true,
        message: 'Form status updated successfully',
        form: {
            id: form.id,
            status: form.status,
            approvedAt: form.approvedAt,
            approvedBy: form.approvedBy,
            notes: form.notes
        }
    });
});

/**
 * Delete form (Admin only)
 */
const deleteForm = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const form = await Form.findOne({ id });
    
    if (!form) {
        throw new APIError('Form not found', 404, 'FORM_NOT_FOUND');
    }

    await Form.deleteOne({ id });

    logger.info(`Form deleted: ${id}`, {
        formId: id,
        deletedBy: req.user.username,
        depot: form.depot,
        submittedAt: form.submittedAt
    });

    res.json({
        success: true,
        message: 'Form deleted successfully'
    });
});

/**
 * Get form statistics (Admin only)
 */
const getFormStatistics = asyncHandler(async (req, res) => {
    const { startDate, endDate, depot } = req.query;

    // Build filter for statistics
    const filter = {};
    
    if (startDate && endDate) {
        filter.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    } else {
        // Default to last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.date = { $gte: thirtyDaysAgo };
    }
    
    if (depot) {
        filter.depot = depot;
    }

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
        statistics,
        formsToday,
        recentForms,
        statusBreakdown,
        depotBreakdown
    ] = await Promise.all([
        Form.getStatistics(filter),
        Form.countDocuments({
            submittedAt: { $gte: today, $lt: tomorrow }
        }),
        Form.findRecent(7, 10),
        Form.aggregate([
            { $match: filter },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Form.aggregate([
            { $match: filter },
            { $group: { _id: '$depot', count: { $sum: 1 }, totalFuel: { $sum: { $sum: '$vehicles.quantiteLivree' } } } },
            { $sort: { count: -1 } }
        ])
    ]);

    res.json({
        success: true,
        statistics: {
            ...statistics,
            formsToday
        },
        breakdowns: {
            status: statusBreakdown.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            depots: depotBreakdown.map(item => ({
                depot: item._id,
                formCount: item.count,
                totalFuel: Math.round(item.totalFuel || 0)
            }))
        },
        recentForms: recentForms.map(form => ({
            id: form.id,
            depot: form.depot,
            date: form.date,
            status: form.status,
            vehicleCount: form.vehicleCount,
            totalFuel: form.totalFuelDelivered,
            submittedAt: form.submittedAt
        }))
    });
});

/**
 * Get forms by date range
 */
const getFormsByDateRange = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        throw new APIError('Start date and end date are required', 400, 'DATE_RANGE_REQUIRED');
    }

    const forms = await Form.findByDateRange(startDate, endDate, {
        status: req.query.status,
        depot: req.query.depot
    }).select('-signatureResponsable -signatureChef');

    res.json({
        success: true,
        forms,
        count: forms.length,
        dateRange: { startDate, endDate }
    });
});

/**
 * Bulk update forms
 */
const bulkUpdateForms = asyncHandler(async (req, res) => {
    const { formIds, updates } = req.body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
        throw new APIError('Form IDs array is required', 400, 'FORM_IDS_REQUIRED');
    }

    // Validate updates object
    const allowedUpdates = ['status', 'notes'];
    const updateData = {};
    
    Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
            updateData[key] = updates[key];
        }
    });

    if (Object.keys(updateData).length === 0) {
        throw new APIError('No valid updates provided', 400, 'NO_VALID_UPDATES');
    }

    // Add timestamp
    updateData.updatedAt = new Date();
    
    if (updateData.status === 'approved') {
        updateData.approvedAt = new Date();
        updateData.approvedBy = req.userId;
    }

    // Perform bulk update
    const result = await Form.updateMany(
        { id: { $in: formIds } },
        { $set: updateData }
    );

    logger.info(`Bulk update performed on ${result.modifiedCount} forms`, {
        formIds,
        updates: updateData,
        updatedBy: req.user.username
    });

    res.json({
        success: true,
        message: `${result.modifiedCount} forms updated successfully`,
        updated: result.modifiedCount,
        matched: result.matchedCount
    });
});

module.exports = {
    submitForm,
    getAllForms,
    getFormById,
    updateFormStatus,
    deleteForm,
    getFormStatistics,
    getFormsByDateRange,
    bulkUpdateForms
};