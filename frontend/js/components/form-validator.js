/**
 * Form Validator Component
 * Handles form validation and error display
 */

class FormValidator {
    constructor() {
        this.errors = {};
        this.init();
    }

    init() {
        console.log('✅ Form Validator initialized');
    }

    /**
     * Validate required fields
     */
    validateRequired(value, fieldName) {
        if (!value || value.toString().trim() === '') {
            this.addError(fieldName, `${fieldName} is required`);
            return false;
        }
        this.removeError(fieldName);
        return true;
    }

    /**
     * Validate number fields
     */
    validateNumber(value, fieldName, min = 0, max = null) {
        if (value !== '' && value !== null && value !== undefined) {
            const num = parseFloat(value);
            if (isNaN(num)) {
                this.addError(fieldName, `${fieldName} must be a valid number`);
                return false;
            }
            if (num < min) {
                this.addError(fieldName, `${fieldName} must be at least ${min}`);
                return false;
            }
            if (max !== null && num > max) {
                this.addError(fieldName, `${fieldName} cannot exceed ${max}`);
                return false;
            }
        }
        this.removeError(fieldName);
        return true;
    }

    /**
     * Validate date fields
     */
    validateDate(value, fieldName) {
        if (value) {
            const date = new Date(value);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // End of today
            
            if (isNaN(date.getTime())) {
                this.addError(fieldName, `${fieldName} must be a valid date`);
                return false;
            }
            if (date > today) {
                this.addError(fieldName, `${fieldName} cannot be in the future`);
                return false;
            }
        }
        this.removeError(fieldName);
        return true;
    }

    /**
     * Validate vehicle data
     */
    validateVehicles(vehicles) {
        if (!vehicles || vehicles.length === 0) {
            this.addError('vehicles', 'At least one vehicle is required');
            return false;
        }

        let isValid = true;
        vehicles.forEach((vehicle, index) => {
            if (!vehicle.matricule || vehicle.matricule.trim() === '') {
                this.addError(`vehicle_${index}_matricule`, 'Vehicle matricule is required');
                isValid = false;
            }
            if (!vehicle.chauffeur || vehicle.chauffeur.trim() === '') {
                this.addError(`vehicle_${index}_chauffeur`, 'Driver name is required');
                isValid = false;
            }
        });

        if (isValid) {
            this.removeError('vehicles');
        }
        return isValid;
    }

    /**
     * Add error
     */
    addError(fieldName, message) {
        this.errors[fieldName] = message;
        this.displayError(fieldName, message);
    }

    /**
     * Remove error
     */
    removeError(fieldName) {
        delete this.errors[fieldName];
        this.hideError(fieldName);
    }

    /**
     * Display error message
     */
    displayError(fieldName, message) {
        const field = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (field) {
            field.classList.add('is-invalid');
            
            // Remove existing error message
            const existingError = field.parentNode.querySelector('.invalid-feedback');
            if (existingError) {
                existingError.remove();
            }

            // Add new error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            errorDiv.textContent = message;
            field.parentNode.appendChild(errorDiv);
        }
    }

    /**
     * Hide error message
     */
    hideError(fieldName) {
        const field = document.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (field) {
            field.classList.remove('is-invalid');
            const errorDiv = field.parentNode.querySelector('.invalid-feedback');
            if (errorDiv) {
                errorDiv.remove();
            }
        }
    }

    /**
     * Clear all errors
     */
    clearErrors() {
        this.errors = {};
        document.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(error => {
            error.remove();
        });
    }

    /**
     * Check if form is valid
     */
    isValid() {
        return Object.keys(this.errors).length === 0;
    }

    /**
     * Get all errors
     */
    getErrors() {
        return this.errors;
    }
}

// Export for use in other scripts
window.FormValidator = FormValidator;