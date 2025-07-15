/**
 * User Model
 * Handles user authentication and management
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    role: {
        type: String,
        enum: ['admin', 'supervisor', 'user'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
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

// Indexes for performance
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
    // Only hash password if it's modified
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to update timestamp
UserSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Instance method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
    if (this.isLocked) {
        throw new Error('Account is temporarily locked');
    }
    
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        
        if (isMatch) {
            // Reset login attempts on successful login
            if (this.loginAttempts > 0) {
                this.loginAttempts = 0;
                this.lockUntil = undefined;
                await this.save();
            }
            return true;
        } else {
            // Increment login attempts
            await this.incrementLoginAttempts();
            return false;
        }
    } catch (error) {
        throw error;
    }
};

// Instance method to increment login attempts
UserSchema.methods.incrementLoginAttempts = async function() {
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30 minutes
    
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Lock account after max attempts
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime };
    }
    
    return this.updateOne(updates);
};

// Instance method to update last login
UserSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return this.save();
};

// Static method to find active users
UserSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

// Static method to create admin user
UserSchema.statics.createAdmin = async function(userData) {
    const admin = new this({
        ...userData,
        role: 'admin'
    });
    return admin.save();
};

// Transform output (remove sensitive fields)
UserSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.loginAttempts;
    delete userObject.lockUntil;
    return userObject;
};

// Static method for safe user lookup
UserSchema.statics.findByUsername = function(username) {
    return this.findOne({ 
        username: username.toLowerCase(),
        isActive: true 
    });
};

module.exports = mongoose.model('User', UserSchema);