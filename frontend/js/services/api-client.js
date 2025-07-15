/**
 * ETER API Client
 * Clean, modular API communication service
 */

class ETERApiClient {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('eter_auth_token');
        this.user = JSON.parse(localStorage.getItem('eter_user') || 'null');
    }

    /**
     * Set authorization headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * Generic API request method
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Handle non-JSON responses (like PDFs)
            if (options.responseType === 'blob') {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.blob();
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * Authentication Methods
     */
    async login(username, password) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            
            if (response.success && response.token) {
                this.token = response.token;
                this.user = response.user;
                localStorage.setItem('eter_auth_token', this.token);
                localStorage.setItem('eter_user', JSON.stringify(this.user));
            }
            
            return response;
        } catch (error) {
            throw new Error(error.message || 'Erreur de connexion');
        }
    }

    async logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('eter_auth_token');
        localStorage.removeItem('eter_user');
    }

    async verifyToken() {
        if (!this.token) return false;
        
        try {
            const response = await this.request('/auth/verify');
            return response.success;
        } catch (error) {
            console.warn('Token verification failed:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Form Methods
     */
    async submitForm(formData) {
        try {
            return await this.request('/forms', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        } catch (error) {
            throw new Error(error.message || 'Erreur lors de la soumission du formulaire');
        }
    }

    /**
     * Admin Methods
     */
    async getAdminStats() {
        try {
            return await this.request('/admin/stats');
        } catch (error) {
            throw new Error(error.message || 'Erreur lors de la récupération des statistiques');
        }
    }

    async getReports(page = 1, limit = 50, filters = {}) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...filters
            });
            
            return await this.request(`/admin/reports?${params}`);
        } catch (error) {
            throw new Error(error.message || 'Erreur lors de la récupération des rapports');
        }
    }

    async getReport(id) {
        try {
            return await this.request(`/admin/reports/${id}`);
        } catch (error) {
            throw new Error(error.message || 'Erreur lors de la récupération du rapport');
        }
    }

    async getReportPDF(id) {
        try {
            return await this.request(`/admin/reports/${id}/pdf`, {
                responseType: 'blob'
            });
        } catch (error) {
            throw new Error(error.message || 'Erreur lors de la génération du PDF');
        }
    }

    /**
     * Utility Methods
     */
    async checkHealth() {
        try {
            return await this.request('/health');
        } catch (error) {
            throw new Error('Service indisponible');
        }
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    getCurrentUser() {
        return this.user;
    }

    /**
     * Error handling utilities
     */
    handleApiError(error) {
        console.error('API Error:', error);
        
        // Common error messages
        const errorMessages = {
            'Network Error': 'Problème de connexion réseau',
            'Unauthorized': 'Session expirée, veuillez vous reconnecter',
            'Forbidden': 'Accès non autorisé',
            'Not Found': 'Ressource non trouvée',
            'Internal Server Error': 'Erreur serveur interne'
        };
        
        return errorMessages[error.message] || error.message || 'Une erreur est survenue';
    }
}

// Global instance
window.apiClient = new ETERApiClient();

console.log('✅ ETER API Client initialized');

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ETERApiClient;
}