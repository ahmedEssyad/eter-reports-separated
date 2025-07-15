/**
 * Vehicle Table Component
 * Handles dynamic vehicle table management
 */

class VehicleTable {
    constructor() {
        this.vehicles = [];
        this.tableBody = null;
        this.init();
    }

    init() {
        this.tableBody = document.querySelector('#vehicleTableBody');
        if (!this.tableBody) {
            console.error('Vehicle table body not found');
            return;
        }

        this.bindEvents();
        this.addVehicle(); // Add first vehicle row
        console.log('✅ Vehicle Table initialized');
    }

    bindEvents() {
        // Add vehicle button
        const addBtn = document.querySelector('#addVehicleBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addVehicle());
        }

        // Delete vehicle buttons (using event delegation)
        this.tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-vehicle-btn')) {
                const row = e.target.closest('tr');
                const index = parseInt(row.dataset.index);
                this.removeVehicle(index);
            }
        });

        // Update vehicles data when inputs change
        this.tableBody.addEventListener('input', () => {
            this.updateVehiclesData();
        });
    }

    addVehicle() {
        const index = this.vehicles.length;
        const vehicleData = {
            matricule: '',
            chauffeur: '',
            heureRevif: '',
            quantiteLivree: '',
            lieuComptage: ''
        };

        this.vehicles.push(vehicleData);
        this.renderVehicleRow(vehicleData, index);
        this.updateDeleteButtons();
    }

    removeVehicle(index) {
        if (this.vehicles.length <= 1) {
            alert('Au moins un véhicule est requis');
            return;
        }

        this.vehicles.splice(index, 1);
        this.renderTable();
    }

    renderVehicleRow(vehicle, index) {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.innerHTML = `
            <td>
                <input type="text" 
                       class="form-control form-control-sm" 
                       name="vehicles[${index}][matricule]"
                       value="${vehicle.matricule}"
                       placeholder="Ex: ABC123"
                       required>
            </td>
            <td>
                <input type="text" 
                       class="form-control form-control-sm" 
                       name="vehicles[${index}][chauffeur]"
                       value="${vehicle.chauffeur}"
                       placeholder="Nom du chauffeur"
                       required>
            </td>
            <td>
                <input type="time" 
                       class="form-control form-control-sm" 
                       name="vehicles[${index}][heureRevif]"
                       value="${vehicle.heureRevif}">
            </td>
            <td>
                <input type="number" 
                       class="form-control form-control-sm" 
                       name="vehicles[${index}][quantiteLivree]"
                       value="${vehicle.quantiteLivree}"
                       min="0"
                       step="0.1"
                       placeholder="0.0">
            </td>
            <td>
                <input type="text" 
                       class="form-control form-control-sm" 
                       name="vehicles[${index}][lieuComptage]"
                       value="${vehicle.lieuComptage}"
                       placeholder="Lieu de comptage">
            </td>
            <td>
                <button type="button" 
                        class="btn btn-danger btn-sm delete-vehicle-btn" 
                        title="Supprimer ce véhicule">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;

        this.tableBody.appendChild(row);
    }

    renderTable() {
        this.tableBody.innerHTML = '';
        this.vehicles.forEach((vehicle, index) => {
            this.renderVehicleRow(vehicle, index);
        });
        this.updateDeleteButtons();
    }

    updateDeleteButtons() {
        const deleteButtons = this.tableBody.querySelectorAll('.delete-vehicle-btn');
        deleteButtons.forEach(btn => {
            btn.style.display = this.vehicles.length > 1 ? 'inline-block' : 'none';
        });
    }

    updateVehiclesData() {
        const rows = this.tableBody.querySelectorAll('tr');
        this.vehicles = [];

        rows.forEach((row, index) => {
            const inputs = row.querySelectorAll('input');
            const vehicleData = {
                matricule: inputs[0].value,
                chauffeur: inputs[1].value,
                heureRevif: inputs[2].value,
                quantiteLivree: inputs[3].value,
                lieuComptage: inputs[4].value
            };
            this.vehicles[index] = vehicleData;
        });
    }

    getVehiclesData() {
        this.updateVehiclesData();
        return this.vehicles.filter(vehicle => 
            vehicle.matricule.trim() !== '' || vehicle.chauffeur.trim() !== ''
        );
    }

    clearTable() {
        this.vehicles = [];
        this.tableBody.innerHTML = '';
        this.addVehicle(); // Add one empty row
    }

    setVehiclesData(vehiclesData) {
        this.vehicles = vehiclesData || [];
        if (this.vehicles.length === 0) {
            this.addVehicle();
        } else {
            this.renderTable();
        }
    }
}

// Export for use in other scripts
window.VehicleTable = VehicleTable;