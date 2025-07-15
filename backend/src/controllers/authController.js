/**
 * Authentication Controller
 * Handles user authentication and authorization
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { APIError, asyncHandler } = require('../middleware/error');
const logger = require('../utils/logger');

/**
 * Generate JWT token
 */
const generateToken = (userId, username, role) => {
    return jwt.sign(
        { id: userId, username, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

/**
 * Login user
 */
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findByUsername(username.toLowerCase());
    
    if (!user) {
        logger.warn(`Failed login attempt for username: ${username}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        throw new APIError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if account is locked
    if (user.isLocked) {
        logger.warn(`Login attempt on locked account: ${username}`, {
            ip: req.ip,
            lockUntil: user.lockUntil
        });
        
        throw new APIError(
            'Account is temporarily locked due to too many failed login attempts',
            423,
            'ACCOUNT_LOCKED',
            { lockUntil: user.lockUntil }
        );
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
        logger.warn(`Invalid password for username: ${username}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        throw new APIError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user._id, user.username, user.role);
    const expiresIn = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    logger.info(`Successful login for user: ${username}`, {
        userId: user._id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        message: 'Login successful',
        token,
        expiresIn,
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            lastLogin: user.lastLogin
        }
    });
});

/**
 * Verify token
 */
const verifyToken = asyncHandler(async (req, res) => {
    // User is already attached to req by auth middleware
    const user = req.user;

    res.json({
        success: true,
        message: 'Token is valid',
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            lastLogin: user.lastLogin
        }
    });
});

/**
 * Logout user (client-side token removal)
 */
const logout = asyncHandler(async (req, res) => {
    logger.info(`User logout: ${req.user.username}`, {
        userId: req.user._id,
        ip: req.ip
    });

    res.json({
        success: true,
        message: 'Logout successful'
    });
});

/**
 * Change password
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
        throw new APIError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.username}`, {
        userId: user._id,
        ip: req.ip
    });

    res.json({
        success: true,
        message: 'Password changed successfully'
    });
});

/**
 * Get current user profile
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
        success: true,
        user
    });
});

/**
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { name } = req.body;
    
    const user = await User.findByIdAndUpdate(
        req.userId,
        { name, updatedAt: new Date() },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    logger.info(`Profile updated for user: ${user.username}`, {
        userId: user._id,
        changes: { name }
    });

    res.json({
        success: true,
        message: 'Profile updated successfully',
        user
    });
});

/**
 * Admin: Get all users
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        User.find()
            .select('-password -loginAttempts -lockUntil')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments()
    ]);

    res.json({
        success: true,
        users,
        pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: users.length,
            totalRecords: total
        }
    });
});

/**
 * Admin: Create user
 */
const createUser = asyncHandler(async (req, res) => {
    const { username, password, name, role } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
        throw new APIError('Username already exists', 400, 'USERNAME_EXISTS');
    }

    const user = new User({
        username: username.toLowerCase(),
        password,
        name,
        role: role || 'user'
    });

    await user.save();

    logger.info(`User created: ${user.username}`, {
        createdBy: req.user._id,
        newUserId: user._id,
        role: user.role
    });

    res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
            id: user._id,
            username: user.username,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt
        }
    });
});

/**
 * Admin: Update user
 */
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, role, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
        id,
        { name, role, isActive, updatedAt: new Date() },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    logger.info(`User updated: ${user.username}`, {
        updatedBy: req.user._id,
        userId: user._id,
        changes: { name, role, isActive }
    });

    res.json({
        success: true,
        message: 'User updated successfully',
        user
    });
});

/**
 * Admin: Delete user
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.userId.toString()) {
        throw new APIError('Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
    }

    const user = await User.findById(id);
    if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
    }

    await User.findByIdAndDelete(id);

    logger.info(`User deleted: ${user.username}`, {
        deletedBy: req.user._id,
        deletedUserId: user._id
    });

    res.json({
        success: true,
        message: 'User deleted successfully'
    });
});

module.exports = {
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
};