/**
 * Middleware Index
 * Centralized middleware exports
 */

const auth = require('./auth');
const validation = require('./validation');
const error = require('./error');
const security = require('./security');

module.exports = {
    ...auth,
    ...validation,
    ...error,
    ...security
};