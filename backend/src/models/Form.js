/**
 * Form Model
 * Handles daily report form data
 */

const mongoose = require('mongoose');

// Vehicle subdocument schema
const VehicleSchema = new mongoose.Schema({
    matricule: {
        type: String,
        required: [true, 'Vehicle matricule is required'],
        trim: true,
        uppercase: true,
        maxlength: [20, 'Matricule cannot exceed 20 characters']
    },
    chauffeur: {
        type: String,
        required: [true, 'Driver name is required'],
        trim: true,
        maxlength: [100, 'Driver name cannot exceed 100 characters']
    },
    heureRevif: {
        type: String,
        trim: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    quantiteLivree: {
        type: Number,
        min: [0, 'Quantity delivered cannot be negative'],
        max: [10000, 'Quantity delivered seems too high']
    },
    lieuComptage: {
        type: String,
        trim: true,
        maxlength: [200, 'Location cannot exceed 200 characters']
    }
}, { _id: false });

const FormSchema = new mongoose.Schema({
    id: {
        type: String,
        required: [true, 'Form ID is required'],
        unique: true,
        trim: true,
        index: true
    },
    entree: {
        type: String,
        required: [true, 'Entry is required'],
        trim: true,
        maxlength: [100, 'Entry cannot exceed 100 characters']
    },
    origine: {
        type: String,
        required: [true, 'Origin is required'],
        trim: true,
        maxlength: [100, 'Origin cannot exceed 100 characters']
    },
    depot: {
        type: String,
        required: [true, 'Depot is required'],
        trim: true,
        maxlength: [100, 'Depot cannot exceed 100 characters']
    },
    chantier: {
        type: String,
        required: [true, 'Construction site is required'],
        trim: true,
        maxlength: [100, 'Construction site cannot exceed 100 characters']
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
        index: true
    },
    stockDebut: {
        type: Number,
        min: [0, 'Start stock cannot be negative'],
        max: [100000, 'Start stock seems too high']
    },
    stockFin: {
        type: Number,
        min: [0, 'End stock cannot be negative'],
        max: [100000, 'End stock seems too high']
    },
    sortieGasoil: {
        type: Number,
        min: [0, 'Diesel output cannot be negative'],
        max: [50000, 'Diesel output seems too high']
    },
    debutIndex: {
        type: Number,
        min: [0, 'Start index cannot be negative']
    },
    finIndex: {
        type: Number,
        min: [0, 'End index cannot be negative']
    },
    vehicles: {
        type: [VehicleSchema],
        validate: {
            validator: function(vehicles) {
                return vehicles && vehicles.length > 0;
            },
            message: 'At least one vehicle is required'
        }
    },
    signatureResponsable: {
        type: String,
        required: [true, 'Supervisor signature is required']
    },
    signatureUrlResponsable: {
        type: String,
        trim: true
    },
    signatureChef: {
        type: String,
        required: [true, 'Chief signature is required']
    },
    signatureUrlChef: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected'],
        default: 'submitted',
        index: true
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    submittedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    ipAddress: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance and queries
FormSchema.index({ date: -1, status: 1 });
FormSchema.index({ submittedAt: -1 });
FormSchema.index({ depot: 1, date: -1 });
FormSchema.index({ 'vehicles.matricule': 1 });
FormSchema.index({ 'vehicles.chauffeur': 1 });

// Compound index for efficient pagination
FormSchema.index({ submittedAt: -1, _id: 1 });

// Virtual for total fuel delivered
FormSchema.virtual('totalFuelDelivered').get(function() {
    if (!this.vehicles || this.vehicles.length === 0) return 0;
    
    return this.vehicles.reduce((total, vehicle) => {
        return total + (vehicle.quantiteLivree || 0);
    }, 0);
});

// Virtual for vehicle count
FormSchema.virtual('vehicleCount').get(function() {
    return this.vehicles ? this.vehicles.length : 0;
});

// Virtual for unique drivers count
FormSchema.virtual('uniqueDriversCount').get(function() {
    if (!this.vehicles || this.vehicles.length === 0) return 0;
    
    const uniqueDrivers = new Set();
    this.vehicles.forEach(vehicle => {
        if (vehicle.chauffeur) {
            uniqueDrivers.add(vehicle.chauffeur.toLowerCase().trim());
        }
    });
    
    return uniqueDrivers.size;
});

// Pre-save middleware to validate data consistency
FormSchema.pre('save', function(next) {
    // Update timestamp
    this.updatedAt = Date.now();
    
    // Validate stock consistency
    if (this.stockDebut !== undefined && this.stockFin !== undefined && this.sortieGasoil !== undefined) {
        const calculatedEnd = this.stockDebut - this.sortieGasoil;
        const tolerance = 0.1; // Allow small rounding differences
        
        if (Math.abs(this.stockFin - calculatedEnd) > tolerance) {
            console.warn(`Stock inconsistency detected for form ${this.id}: Start(${this.stockDebut}) - Output(${this.sortieGasoil}) ≠ End(${this.stockFin})`);
        }
    }
    
    next();
});

// Pre-save middleware to validate date
FormSchema.pre('save', function(next) {
    // Ensure date is not in the future
    if (this.date && this.date > new Date()) {
        return next(new Error('Report date cannot be in the future'));
    }
    
    // Ensure date is not too old (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (this.date && this.date < oneYearAgo) {
        console.warn(`Old report date detected for form ${this.id}: ${this.date}`);
    }
    
    next();
});

// Static method to find reports by date range
FormSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
    const query = {
        date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    };
    
    if (options.status) {
        query.status = options.status;
    }
    
    if (options.depot) {
        query.depot = options.depot;
    }
    
    return this.find(query).sort({ date: -1 });
};

// Static method to find recent reports
FormSchema.statics.findRecent = function(days = 7, limit = 50) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.find({
        submittedAt: { $gte: cutoffDate }
    })
    .sort({ submittedAt: -1 })
    .limit(limit);
};

// Static method for statistics
FormSchema.statics.getStatistics = async function(filters = {}) {
    const matchStage = {};
    
    if (filters.startDate && filters.endDate) {
        matchStage.date = {
            $gte: new Date(filters.startDate),
            $lte: new Date(filters.endDate)
        };
    }
    
    if (filters.depot) {
        matchStage.depot = filters.depot;
    }
    
    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalReports: { $sum: 1 },
                totalFuelDelivered: {
                    $sum: {
                        $sum: '$vehicles.quantiteLivree'
                    }
                },
                totalVehicles: {
                    $sum: { $size: '$vehicles' }
                },
                uniqueDrivers: {
                    $addToSet: '$vehicles.chauffeur'
                },
                avgVehiclesPerReport: {
                    $avg: { $size: '$vehicles' }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalReports: 1,
                totalFuelDelivered: { $round: ['$totalFuelDelivered', 2] },
                totalVehicles: 1,
                uniqueDriversCount: { $size: '$uniqueDrivers' },
                avgVehiclesPerReport: { $round: ['$avgVehiclesPerReport', 2] }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalReports: 0,
        totalFuelDelivered: 0,
        totalVehicles: 0,
        uniqueDriversCount: 0,
        avgVehiclesPerReport: 0
    };
};

// Instance method to approve form
FormSchema.methods.approve = function(userId) {
    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = userId;
    return this.save();
};

// Instance method to reject form
FormSchema.methods.reject = function(reason) {
    this.status = 'rejected';
    this.notes = reason;
    return this.save();
};

// Transform output for API responses
FormSchema.methods.toJSON = function() {
    const formObject = this.toObject({ virtuals: true });
    
    // Remove large signature data for list views (keep URLs)
    if (formObject.signatureResponsable && formObject.signatureResponsable.length > 100) {
        delete formObject.signatureResponsable;
    }
    if (formObject.signatureChef && formObject.signatureChef.length > 100) {
        delete formObject.signatureChef;
    }
    
    return formObject;
};

module.exports = mongoose.model('Form', FormSchema);