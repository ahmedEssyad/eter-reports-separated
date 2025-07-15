/**
 * Utility Helper Functions
 * Common utility functions used across the application
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate unique ID
 */
const generateUniqueId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = crypto.randomBytes(4).toString('hex');
    return `${timestamp}-${randomStr}`;
};

/**
 * Save signature file to disk
 */
const saveSignature = async (signatureBase64, identifier) => {
    try {
        if (!signatureBase64 || !signatureBase64.startsWith('data:image/')) {
            throw new Error('Invalid signature format');
        }

        // Extract base64 data
        const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
        
        // Generate filename
        const filename = `signature_${identifier}_${Date.now()}.png`;
        
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // Save file
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        
        return `/uploads/${filename}`;
    } catch (error) {
        console.error('Error saving signature:', error);
        return null;
    }
};

/**
 * Validate base64 image
 */
const validateBase64Image = (base64String) => {
    if (!base64String || typeof base64String !== 'string') {
        return false;
    }

    // Check if it's a valid base64 image format
    const regex = /^data:image\/(png|jpeg|jpg|gif);base64,/;
    if (!regex.test(base64String)) {
        return false;
    }

    // Check if base64 data is valid
    try {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        Buffer.from(base64Data, 'base64');
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-z0-9.-]/gi, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase();
};

/**
 * Generate secure random token
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash string using SHA256
 */
const hashString = (str) => {
    return crypto.createHash('sha256').update(str).digest('hex');
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

/**
 * Validate phone number (basic)
 */
const validatePhoneNumber = (phone) => {
    const regex = /^[\+]?[1-9][\d]{0,15}$/;
    return regex.test(phone.replace(/\s/g, ''));
};

/**
 * Convert string to slug
 */
const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const cloned = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
};

/**
 * Format date to French locale
 */
const formatDateFR = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

/**
 * Format datetime to French locale
 */
const formatDateTimeFR = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Calculate date difference in days
 */
const daysDifference = (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    
    return Math.round(Math.abs((firstDate - secondDate) / oneDay));
};

/**
 * Check if date is within range
 */
const isDateInRange = (date, startDate, endDate) => {
    const checkDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return checkDate >= start && checkDate <= end;
};

/**
 * Capitalize first letter of each word
 */
const capitalizeWords = (str) => {
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
};

/**
 * Remove accents from string
 */
const removeAccents = (str) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Truncate string with ellipsis
 */
const truncateString = (str, length, suffix = '...') => {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
};

/**
 * Parse query string to object
 */
const parseQueryString = (queryString) => {
    const params = new URLSearchParams(queryString);
    const result = {};
    
    for (let [key, value] of params) {
        result[key] = value;
    }
    
    return result;
};

/**
 * Build query string from object
 */
const buildQueryString = (obj) => {
    const params = new URLSearchParams();
    
    Object.keys(obj).forEach(key => {
        if (obj[key] !== null && obj[key] !== undefined) {
            params.append(key, obj[key]);
        }
    });
    
    return params.toString();
};

/**
 * Retry async function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const waitTime = delay * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

/**
 * Debounce function
 */
const debounce = (func, wait, immediate = false) => {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func(...args);
    };
};

/**
 * Throttle function
 */
const throttle = (func, limit) => {
    let inThrottle;
    
    return function() {
        const args = arguments;
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

/**
 * Get nested object property safely
 */
const getNestedProperty = (obj, path, defaultValue = null) => {
    const keys = path.split('.');
    let current = obj;
    
    for (let key of keys) {
        if (current === null || current === undefined || !current.hasOwnProperty(key)) {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current;
};

/**
 * Set nested object property
 */
const setNestedProperty = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (let key of keys) {
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
    return obj;
};

module.exports = {
    generateUniqueId,
    saveSignature,
    validateBase64Image,
    formatFileSize,
    sanitizeFilename,
    generateSecureToken,
    hashString,
    validateEmail,
    validatePhoneNumber,
    slugify,
    deepClone,
    formatDateFR,
    formatDateTimeFR,
    daysDifference,
    isDateInRange,
    capitalizeWords,
    removeAccents,
    truncateString,
    parseQueryString,
    buildQueryString,
    retryWithBackoff,
    debounce,
    throttle,
    isEmpty,
    getNestedProperty,
    setNestedProperty
};