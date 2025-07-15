/**
 * ETER Authentication - Login Page
 * Handles admin login functionality
 */

class ETERAuthLogin {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameField = document.getElementById('username');
        this.passwordField = document.getElementById('password');
        this.loginBtn = document.getElementById('loginBtn');
        this.errorAlert = document.getElementById('errorAlert');
        this.errorMessage = document.getElementById('errorMessage');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkExistingAuth();
        
        console.log('✅ ETER Auth Login initialized');
    }

    bindEvents() {
        // Form submission
        this.form?.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Password toggle
        document.getElementById('togglePassword')?.addEventListener('click', () => this.togglePassword());
        
        // Enter key support
        this.passwordField?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin(e);
            }
        });
    }

    async checkExistingAuth() {
        try {
            if (apiClient.isAuthenticated()) {
                const isValid = await apiClient.verifyToken();
                if (isValid) {
                    // Redirect to admin dashboard
                    window.location.href = './admin-dashboard.html';
                }
            }
        } catch (error) {
            console.log('No existing authentication');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        // Clear previous errors
        this.hideError();
        
        // Get form data
        const username = this.usernameField.value.trim();
        const password = this.passwordField.value;
        
        // Validate input
        if (!username || !password) {
            this.showError('Veuillez saisir votre nom d\'utilisateur et mot de passe');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            // Attempt login
            const response = await apiClient.login(username, password);
            
            if (response.success) {
                // Show success message briefly
                this.showSuccess('Connexion réussie! Redirection...');
                
                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = './admin-dashboard.html';
                }, 1000);
            } else {
                throw new Error(response.message || 'Échec de la connexion');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError(this.getErrorMessage(error));
        } finally {
            this.setLoadingState(false);
        }
    }

    togglePassword() {
        const toggleBtn = document.getElementById('togglePassword');
        const icon = toggleBtn.querySelector('i');
        
        if (this.passwordField.type === 'password') {
            this.passwordField.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            this.passwordField.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.loginBtn.disabled = true;
            this.loginBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Connexion...
            `;
            this.loadingOverlay?.classList.remove('d-none');
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.innerHTML = `
                <i class="fas fa-sign-in-alt me-2"></i>
                Se connecter
            `;
            this.loadingOverlay?.classList.add('d-none');
        }
    }

    showError(message) {
        if (this.errorAlert && this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorAlert.classList.remove('d-none');
            
            // Auto-hide after 5 seconds
            setTimeout(() => this.hideError(), 5000);
        }
    }

    hideError() {
        this.errorAlert?.classList.add('d-none');
    }

    showSuccess(message) {
        // Create temporary success alert
        const successAlert = document.createElement('div');
        successAlert.className = 'alert alert-success mt-3';
        successAlert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
        `;
        
        // Insert after form
        this.form.parentNode.insertBefore(successAlert, this.form.nextSibling);
        
        // Remove after delay
        setTimeout(() => {
            successAlert.remove();
        }, 3000);
    }

    getErrorMessage(error) {
        // Map common error messages to user-friendly text
        const errorMessages = {
            'Invalid credentials': 'Nom d\'utilisateur ou mot de passe incorrect',
            'Username and password required': 'Nom d\'utilisateur et mot de passe requis',
            'Server error': 'Erreur du serveur, veuillez réessayer',
            'Network Error': 'Problème de connexion réseau'
        };
        
        const message = error.message || error.toString();
        return errorMessages[message] || message || 'Une erreur est survenue lors de la connexion';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authLogin = new ETERAuthLogin();
});

console.log('✅ Auth Login component loaded');