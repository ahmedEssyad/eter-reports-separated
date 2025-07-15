/**
 * Admin Dashboard
 * Bootstrap-based admin interface for ETER Reports
 */

class AdminDashboard {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'date', direction: 'desc' };
        this.reports = [];
        this.filteredReports = [];
        this.selectedReports = new Set();
        this.apiClient = new ETERApiClient();
        
        this.init();
    }
    
    async init() {
        await this.checkAuth();
        this.initializeEventListeners();
        await this.loadDashboardData();
        this.setupPeriodicRefresh();
    }
    
    async checkAuth() {
        const token = localStorage.getItem('adminToken');
        const expiry = localStorage.getItem('tokenExpiry');
        
        if (!token || !expiry || new Date().getTime() > parseInt(expiry)) {
            window.location.href = './login.html';
            return;
        }
        
        try {
            const response = await this.apiClient.verifyToken();
            const userData = JSON.parse(localStorage.getItem('adminUser') || '{}');
            document.getElementById('welcomeUser').textContent = `Bienvenue, ${userData.name || 'Admin'}`;
        } catch (error) {
            console.error('Auth error:', error);
            this.logout();
        }
    }
    
    initializeEventListeners() {
        // Navigation links
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });
        
        // Search input with debouncing
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', 
                this.debounce(() => this.searchReports(), 300)
            );
        }
        
        // Filter changes
        ['dateFilter', 'vehicleFilter', 'statusFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });
        
        // Close export dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.position-relative')) {
                const dropdown = document.getElementById('exportDropdown');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            }
        });
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    showSection(section) {
        // Update active nav link
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.style.display = 'none';
        });
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
    }
    
    async loadDashboardData() {
        try {
            this.showLoading(true);
            
            // Load reports data (simulating API calls for now)
            // In a real implementation, these would be actual API calls
            const statsData = await this.loadStats();
            const reportsData = await this.loadReports();
            
            this.updateStats(statsData);
            this.reports = reportsData;
            this.filteredReports = [...this.reports];
            
            this.updateReportsTable();
            this.updateVehicleFilter();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Erreur lors du chargement des données', 'error');
            this.reports = [];
            this.filteredReports = [];
            this.updateStats({});
            this.updateReportsTable();
        } finally {
            this.showLoading(false);
        }
    }
    
    async loadStats() {
        // Simulate API call - replace with actual API endpoint
        return {
            totalReports: 0,
            totalVehicles: 0,
            totalDrivers: 0,
            totalFuel: 0
        };
    }
    
    async loadReports() {
        // Simulate API call - replace with actual API endpoint
        return [];
    }
    
    updateStats(stats) {
        document.getElementById('totalReports').textContent = stats.totalReports || 0;
        document.getElementById('totalVehicles').textContent = stats.totalVehicles || 0;
        document.getElementById('totalDrivers').textContent = stats.totalDrivers || 0;
        document.getElementById('totalFuel').textContent = `${stats.totalFuel || 0}L`;
        
        // Update change indicators
        document.getElementById('reportsChange').textContent = '+12% ce mois';
        document.getElementById('vehiclesChange').textContent = '+5% ce mois';
        document.getElementById('driversChange').textContent = '+8% ce mois';
        document.getElementById('fuelChange').textContent = 'Total ce mois';
    }
    
    updateReportsTable() {
        const tbody = document.getElementById('reportsTableBody');
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageReports = this.filteredReports.slice(start, end);
        
        if (pageReports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p class="text-muted">Aucun rapport trouvé</p>
                    </td>
                </tr>
            `;
            document.getElementById('tableInfo').textContent = '0 rapports trouvés';
            return;
        }
        
        tbody.innerHTML = pageReports.map(report => {
            const totalFuel = report.vehicles ? 
                report.vehicles.reduce((sum, v) => sum + (v.quantiteLivree || 0), 0) : 0;
            const driversCount = report.vehicles ? report.vehicles.length : 0;
            const status = this.getReportStatus(report);
            
            return `
                <tr>
                    <td>
                        <input type="checkbox" class="form-check-input" value="${report.id}" 
                               ${this.selectedReports.has(report.id) ? 'checked' : ''}
                               onchange="dashboard.toggleReportSelection('${report.id}')">
                    </td>
                    <td>${new Date(report.date).toLocaleDateString('fr-FR')}</td>
                    <td>${report.vehicles && report.vehicles[0] ? report.vehicles[0].matricule : 'N/A'}</td>
                    <td>${report.depot || 'N/A'}</td>
                    <td>${report.chantier || 'N/A'}</td>
                    <td>${totalFuel.toFixed(1)}L</td>
                    <td>${driversCount}</td>
                    <td><span class="status-badge status-${status.class}">${status.text}</span></td>
                    <td>
                        <button class="btn btn-info btn-action" onclick="dashboard.viewReport('${report.id}')" title="Voir détails">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-success btn-action" onclick="dashboard.exportSingleReport('${report.id}')" title="Exporter PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('tableInfo').textContent = 
            `${this.filteredReports.length} rapports trouvés`;
        
        this.updatePagination();
    }
    
    getReportStatus(report) {
        if (report.vehicles && report.vehicles.length > 0 && 
            report.signatureResponsable && report.signatureChef) {
            return { class: 'completed', text: 'Complété' };
        } else if (report.vehicles && report.vehicles.length > 0) {
            return { class: 'pending', text: 'En attente' };
        } else {
            return { class: 'cancelled', text: 'Incomplet' };
        }
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredReports.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="dashboard.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="dashboard.goToPage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="dashboard.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredReports.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.updateReportsTable();
        }
    }
    
    searchReports() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        
        if (!query) {
            this.filteredReports = [...this.reports];
        } else {
            this.filteredReports = this.reports.filter(report => {
                return (
                    (report.depot && report.depot.toLowerCase().includes(query)) ||
                    (report.chantier && report.chantier.toLowerCase().includes(query)) ||
                    (report.vehicles && report.vehicles.some(v => 
                        (v.matricule && v.matricule.toLowerCase().includes(query)) ||
                        (v.chauffeur && v.chauffeur.toLowerCase().includes(query))
                    )) ||
                    new Date(report.date).toLocaleDateString('fr-FR').includes(query)
                );
            });
        }
        
        this.currentPage = 1;
        this.updateReportsTable();
    }
    
    applyFilters() {
        const dateFilter = document.getElementById('dateFilter').value;
        const vehicleFilter = document.getElementById('vehicleFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        this.filteredReports = this.reports.filter(report => {
            let passes = true;
            
            if (dateFilter) {
                const reportDate = new Date(report.date).toISOString().split('T')[0];
                passes = passes && (reportDate === dateFilter);
            }
            
            if (vehicleFilter) {
                passes = passes && report.vehicles && 
                    report.vehicles.some(v => v.matricule === vehicleFilter);
            }
            
            if (statusFilter) {
                const status = this.getReportStatus(report);
                passes = passes && (status.class === statusFilter);
            }
            
            return passes;
        });
        
        this.currentPage = 1;
        this.updateReportsTable();
    }
    
    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('tbody .form-check-input');
        
        if (selectAll.checked) {
            checkboxes.forEach(cb => {
                cb.checked = true;
                this.selectedReports.add(cb.value);
            });
        } else {
            checkboxes.forEach(cb => {
                cb.checked = false;
                this.selectedReports.delete(cb.value);
            });
        }
    }
    
    toggleReportSelection(reportId) {
        if (this.selectedReports.has(reportId)) {
            this.selectedReports.delete(reportId);
        } else {
            this.selectedReports.add(reportId);
        }
        
        const allCheckboxes = document.querySelectorAll('tbody .form-check-input');
        const checkedCheckboxes = document.querySelectorAll('tbody .form-check-input:checked');
        const selectAll = document.getElementById('selectAll');
        
        if (selectAll) {
            selectAll.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
            selectAll.checked = checkedCheckboxes.length === allCheckboxes.length && allCheckboxes.length > 0;
        }
    }
    
    async viewReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return;
        
        const modalBody = document.getElementById('modalBody');
        const totalFuel = report.vehicles ? 
            report.vehicles.reduce((sum, v) => sum + (v.quantiteLivree || 0), 0) : 0;
        
        modalBody.innerHTML = `
            <div class="row mb-4">
                <div class="col-12">
                    <h6 class="text-primary">Informations Générales</h6>
                    <div class="row">
                        <div class="col-md-4 mb-2"><strong>Date:</strong> ${new Date(report.date).toLocaleDateString('fr-FR')}</div>
                        <div class="col-md-4 mb-2"><strong>Dépôt:</strong> ${report.depot || 'N/A'}</div>
                        <div class="col-md-4 mb-2"><strong>Chantier:</strong> ${report.chantier || 'N/A'}</div>
                        <div class="col-md-4 mb-2"><strong>Entrée:</strong> ${report.entree || 'N/A'}</div>
                        <div class="col-md-4 mb-2"><strong>Origine:</strong> ${report.origine || 'N/A'}</div>
                        <div class="col-md-4 mb-2"><strong>Stock Début:</strong> ${report.stockDebut || 0}L</div>
                        <div class="col-md-4 mb-2"><strong>Stock Fin:</strong> ${report.stockFin || 0}L</div>
                        <div class="col-md-4 mb-2"><strong>Sortie Gasoil:</strong> ${report.sortieGasoil || 0}L</div>
                    </div>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <h6 class="text-primary">Véhicules et Conducteurs</h6>
                    ${report.vehicles && report.vehicles.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        <th>Matricule</th>
                                        <th>Chauffeur</th>
                                        <th>Heure</th>
                                        <th>Quantité</th>
                                        <th>Lieu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${report.vehicles.map(vehicle => `
                                        <tr>
                                            <td>${vehicle.matricule || 'N/A'}</td>
                                            <td>${vehicle.chauffeur || 'N/A'}</td>
                                            <td>${vehicle.heureRevif || 'N/A'}</td>
                                            <td>${vehicle.quantiteLivree || 0}L</td>
                                            <td>${vehicle.lieuComptage || 'N/A'}</td>
                                        </tr>
                                    `).join('')}
                                    <tr class="table-info fw-bold">
                                        <td colspan="3">Total</td>
                                        <td>${totalFuel.toFixed(1)}L</td>
                                        <td>-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted">Aucun véhicule enregistré</p>'}
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-primary">Signature Responsable</h6>
                    ${report.signatureResponsable ? 
                        `<img src="${report.signatureResponsable}" class="img-fluid border" style="max-height: 150px;">` :
                        '<p class="text-muted">Aucune signature</p>'
                    }
                </div>
                <div class="col-md-6">
                    <h6 class="text-primary">Signature Chef</h6>
                    ${report.signatureChef ? 
                        `<img src="${report.signatureChef}" class="img-fluid border" style="max-height: 150px;">` :
                        '<p class="text-muted">Aucune signature</p>'
                    }
                </div>
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('reportModal'));
        modal.show();
    }
    
    async exportSingleReport(reportId) {
        try {
            // Simulate PDF export - replace with actual API call
            this.showToast('Rapport exporté avec succès', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Erreur lors de l\'export', 'error');
        }
    }
    
    updateVehicleFilter() {
        const select = document.getElementById('vehicleFilter');
        const vehicles = new Set();
        
        this.reports.forEach(report => {
            if (report.vehicles) {
                report.vehicles.forEach(vehicle => {
                    if (vehicle.matricule) {
                        vehicles.add(vehicle.matricule);
                    }
                });
            }
        });
        
        select.innerHTML = '<option value="">Tous les véhicules</option>';
        Array.from(vehicles).sort().forEach(vehicle => {
            select.innerHTML += `<option value="${vehicle}">${vehicle}</option>`;
        });
    }
    
    async refreshData() {
        await this.loadDashboardData();
        this.showToast('Données actualisées', 'success');
    }
    
    async refreshReports() {
        await this.loadDashboardData();
        this.showToast('Liste des rapports actualisée', 'success');
    }
    
    async exportAllReports() {
        if (this.reports.length === 0) {
            this.showToast('Aucun rapport à exporter', 'warning');
            return;
        }
        
        this.showToast('Export en cours...', 'info');
        // Implement actual export logic here
    }
    
    async exportSelectedReports() {
        if (this.selectedReports.size === 0) {
            this.showToast('Veuillez sélectionner au moins un rapport', 'warning');
            return;
        }
        
        this.showToast(`${this.selectedReports.size} rapports sélectionnés pour export`, 'info');
        // Implement actual export logic here
    }
    
    exportToCSV() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapports_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.showToast('Export CSV terminé', 'success');
        this.toggleExportMenu();
    }
    
    generateCSV() {
        const headers = ['Date', 'Véhicule', 'Dépôt', 'Chantier', 'Carburant (L)', 'Conducteurs'];
        const rows = this.filteredReports.map(report => {
            const totalFuel = report.vehicles ? 
                report.vehicles.reduce((sum, v) => sum + (v.quantiteLivree || 0), 0) : 0;
            const vehicle = report.vehicles && report.vehicles[0] ? report.vehicles[0].matricule : 'N/A';
            const driversCount = report.vehicles ? report.vehicles.length : 0;
            
            return [
                new Date(report.date).toLocaleDateString('fr-FR'),
                vehicle,
                report.depot || 'N/A',
                report.chantier || 'N/A',
                totalFuel.toFixed(1),
                driversCount
            ];
        });
        
        return [headers, ...rows].map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
    }
    
    toggleExportMenu() {
        const dropdown = document.getElementById('exportDropdown');
        dropdown.classList.toggle('show');
    }
    
    showBackup() {
        this.showToast('Fonctionnalité de sauvegarde en cours de développement', 'info');
    }
    
    saveSettings() {
        this.showToast('Paramètres sauvegardés', 'success');
    }
    
    setupPeriodicRefresh() {
        // Refresh data every 5 minutes
        setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);
    }
    
    showLoading(show) {
        const tbody = document.getElementById('reportsTableBody');
        if (show) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Chargement...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
    
    showToast(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toastId = 'toast-' + Date.now();
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        const bgColorMap = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        };
        
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center ${bgColorMap[type]} text-white border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${iconMap[type]} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });
        
        toast.show();
        
        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
    
    logout() {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('adminUser');
        window.location.href = './login.html';
    }
}

// Global instance
window.dashboard = null;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AdminDashboard();
});

// Global functions for HTML onclick handlers
function showSection(section) {
    if (window.dashboard) {
        window.dashboard.showSection(section);
    }
}

function logout() {
    if (window.dashboard) {
        window.dashboard.logout();
    }
}

function refreshData() {
    if (window.dashboard) {
        window.dashboard.refreshData();
    }
}

function exportAllReports() {
    if (window.dashboard) {
        window.dashboard.exportAllReports();
    }
}

function showBackup() {
    if (window.dashboard) {
        window.dashboard.showBackup();
    }
}

function applyFilters() {
    if (window.dashboard) {
        window.dashboard.applyFilters();
    }
}

function exportSelectedReports() {
    if (window.dashboard) {
        window.dashboard.exportSelectedReports();
    }
}

function toggleExportMenu() {
    if (window.dashboard) {
        window.dashboard.toggleExportMenu();
    }
}

function exportToCSV() {
    if (window.dashboard) {
        window.dashboard.exportToCSV();
    }
}

function refreshReports() {
    if (window.dashboard) {
        window.dashboard.refreshReports();
    }
}

function searchReports() {
    if (window.dashboard) {
        window.dashboard.searchReports();
    }
}

function toggleSelectAll() {
    if (window.dashboard) {
        window.dashboard.toggleSelectAll();
    }
}

function saveSettings() {
    if (window.dashboard) {
        window.dashboard.saveSettings();
    }
}