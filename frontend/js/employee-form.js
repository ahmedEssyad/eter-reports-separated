/**
 * ETER Employee Form Application
 * Main application logic for daily report submission
 */

class ETEREmployeeForm {
    constructor() {
        this.form = document.getElementById('reportForm');
        this.vehicleTable = null;
        this.formData = {};
        
        this.init();
    }

    init() {
        if (!this.form) {
            console.error('Report form not found');
            return;
        }

        this.bindEvents();
        this.initializeComponents();
        this.setDefaultValues();
        
        console.log('✅ ETER Employee Form initialized');
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Reset button
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetForm());
        
        // Vehicle table will handle its own events
    }

    initializeComponents() {
        // Initialize vehicle table component
        this.vehicleTable = new VehicleTable();
    }

    setDefaultValues() {
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    // Vehicle table component handles adding vehicles

    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!this.validateForm()) {
            this.showToast('Veuillez corriger les erreurs dans le formulaire', 'danger');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            // Collect form data
            const formData = this.collectFormData();
            
            // Submit to API
            const response = await apiClient.submitForm(formData);
            
            if (response.success) {
                this.showToast('Rapport soumis avec succès!', 'success');
                
                // Reset form after delay
                setTimeout(() => {
                    this.resetForm();
                }, 2000);
            } else {
                throw new Error(response.message || 'Erreur lors de la soumission');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            this.showToast(apiClient.handleApiError(error), 'danger');
        } finally {
            this.setLoadingState(false);
        }
    }

    validateForm() {
        let isValid = true;
        
        // Clear previous validation
        this.clearValidation();
        
        // Validate required fields
        const requiredFields = ['entree', 'origine', 'depot', 'chantier', 'date', 'stockDebut', 'stockFin', 'sortieGasoil'];
        
        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!field.value.trim()) {
                this.setFieldError(field, 'Ce champ est requis');
                isValid = false;
            }
        });

        // Validate vehicles
        const vehicles = this.vehicleTable.getVehiclesData();
        if (vehicles.length === 0) {
            this.showToast('Au moins un véhicule doit être ajouté', 'warning');
            isValid = false;
        }

        // Validate each vehicle
        vehicles.forEach((vehicle, index) => {
            if (!vehicle.matricule || !vehicle.chauffeur) {
                this.showToast(`Véhicule ${index + 1}: Matricule et chauffeur requis`, 'warning');
                isValid = false;
            }
        });

        // Validate signatures
        if (!signaturePad.hasAllRequiredSignatures()) {
            this.showToast('Les deux signatures sont requises', 'warning');
            isValid = false;
        }

        return isValid;
    }

    collectFormData() {
        const signatures = signaturePad.getSignatures();
        const vehicles = this.vehicleTable.getVehiclesData();
        
        // Fix vehicle data format for backend validation
        const formattedVehicles = vehicles.map(vehicle => ({
            matricule: vehicle.matricule,
            chauffeur: vehicle.chauffeur,
            heureRevif: vehicle.heureRevif || '',
            quantiteLivree: parseFloat(vehicle.quantiteLivree) || 0,
            lieuComptage: vehicle.lieuComptage || ''
        }));
        
        const formData = {
            entree: document.getElementById('entree').value.trim(),
            origine: document.getElementById('origine').value.trim(),
            depot: document.getElementById('depot').value.trim(),
            chantier: document.getElementById('chantier').value.trim(),
            date: document.getElementById('date').value,
            stockDebut: parseFloat(document.getElementById('stockDebut').value) || 0,
            stockFin: parseFloat(document.getElementById('stockFin').value) || 0,
            sortieGasoil: parseFloat(document.getElementById('sortieGasoil').value) || 0,
            debutIndex: parseFloat(document.getElementById('debutIndex').value) || 0,
            finIndex: parseFloat(document.getElementById('finIndex').value) || 0,
            vehicles: formattedVehicles,
            signatureResponsable: signatures.responsable || '',
            signatureChef: signatures.chef || ''
        };

        return formData;
    }

    resetForm() {
        // Reset form fields
        this.form.reset();
        
        // Clear validation
        this.clearValidation();
        
        // Reset signatures
        signaturePad.reset();
        
        // Reset vehicle table
        this.vehicleTable.clearTable();
        
        // Reset default values
        this.setDefaultValues();
        
        this.showToast('Formulaire réinitialisé', 'info');
    }

    setLoadingState(loading) {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const resetBtn = document.getElementById('resetBtn');
        
        if (loading) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            resetBtn.disabled = true;
        } else {
            submitBtn.classList.remove('btn-loading');
            submitBtn.disabled = false;
            resetBtn.disabled = false;
        }
    }

    setFieldError(field, message) {
        field.classList.add('is-invalid');
        
        let feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    }

    clearValidation() {
        // Remove validation classes
        this.form.querySelectorAll('.is-invalid').forEach(field => {
            field.classList.remove('is-invalid');
        });
        
        this.form.querySelectorAll('.is-valid').forEach(field => {
            field.classList.remove('is-valid');
        });
    }

    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showToast(message, type = 'info') {
        const toastElement = document.getElementById('statusToast');
        if (!toastElement) return;

        const toastBody = toastElement.querySelector('.toast-body');
        const iconClass = this.getToastIcon(type);
        
        toastBody.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${iconClass} me-2"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Update toast styling
        toastElement.className = `toast show bg-${type} text-white`;
        
        // Create Bootstrap toast instance
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: type === 'danger' ? 5000 : 3000
        });
        
        toast.show();
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            warning: 'exclamation-triangle',
            danger: 'times-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// VehicleTable component is loaded from separate file

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.eterForm = new ETEREmployeeForm();
});

console.log('✅ Employee Form application loaded');