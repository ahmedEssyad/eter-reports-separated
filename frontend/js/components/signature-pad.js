/**
 * Signature Pad Component
 * Handles digital signature capture with touch and mouse support
 */

class SignaturePad {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentSignatureType = null;
        this.signatures = {
            responsable: null,
            chef: null
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        console.log('✅ Signature Pad initialized');
    }

    bindEvents() {
        // Signature box clicks
        document.addEventListener('click', (e) => {
            const signatureBox = e.target.closest('.signature-box');
            if (signatureBox && !signatureBox.classList.contains('has-signature')) {
                const type = signatureBox.dataset.type;
                this.openSignatureModal(type);
            }
        });

        // Clear signature buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.signature-clear-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const signatureBox = e.target.closest('.signature-container').querySelector('.signature-box');
                const type = signatureBox.dataset.type;
                this.clearSignature(type);
            }
        });

        // Modal events
        const modal = document.getElementById('signatureModal');
        if (modal) {
            modal.addEventListener('shown.bs.modal', () => this.initCanvas());
            modal.addEventListener('hidden.bs.modal', () => this.cleanup());
        }

        // Canvas control buttons
        document.getElementById('clearSignatureBtn')?.addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveSignatureBtn')?.addEventListener('click', () => this.saveSignature());
    }

    openSignatureModal(type) {
        this.currentSignatureType = type;
        
        // Update modal title
        const title = type === 'responsable' ? 'Signature Responsable' : 'Signature Chef';
        document.getElementById('signatureModalTitle').textContent = title;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('signatureModal'));
        modal.show();
    }

    initCanvas() {
        this.canvas = document.getElementById('signatureCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        // Set canvas size
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = 500;
        this.canvas.height = 200;
        
        // Set drawing properties
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Clear canvas
        this.clearCanvas();
        
        // Bind drawing events
        this.bindCanvasEvents();
    }

    bindCanvasEvents() {
        if (!this.canvas) return;

        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e, 'start'));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e, 'move'));
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
        this.canvas.addEventListener('touchcancel', () => this.stopDrawing());
    }

    startDrawing(e) {
        this.isDrawing = true;
        const coords = this.getCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        e.preventDefault();
        const coords = this.getCoordinates(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();
        
        this.lastX = coords.x;
        this.lastY = coords.y;
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    handleTouch(e, type) {
        e.preventDefault();
        
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent(type === 'start' ? 'mousedown' : 'mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            
            if (type === 'start') {
                this.startDrawing(mouseEvent);
            } else {
                this.draw(mouseEvent);
            }
        }
    }

    getCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    clearCanvas() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Add a white background
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#000000';
        }
    }

    saveSignature() {
        if (!this.canvas || !this.currentSignatureType) return;

        // Check if signature is empty
        if (this.isCanvasEmpty()) {
            this.showToast('Veuillez dessiner une signature avant de sauvegarder', 'warning');
            return;
        }

        // Convert to base64
        const signatureData = this.canvas.toDataURL('image/png');
        
        // Store signature
        this.signatures[this.currentSignatureType] = signatureData;
        
        // Update UI
        this.updateSignatureBox(this.currentSignatureType, signatureData);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('signatureModal'));
        modal.hide();
        
        this.showToast('Signature sauvegardée avec succès', 'success');
    }

    clearSignature(type) {
        this.signatures[type] = null;
        this.updateSignatureBox(type, null);
        this.showToast('Signature effacée', 'info');
    }

    updateSignatureBox(type, signatureData) {
        const signatureBox = document.querySelector(`[data-type="${type}"]`);
        if (!signatureBox) return;

        if (signatureData) {
            // Show signature image
            signatureBox.innerHTML = `
                <div class="signature-title">Signature ${type === 'responsable' ? 'Responsable' : 'Chef'}</div>
                <img src="${signatureData}" alt="Signature" class="signature-image">
                <div class="signature-actions">
                    <button type="button" class="signature-clear-btn" title="Effacer">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            signatureBox.classList.add('has-signature');
        } else {
            // Show placeholder
            signatureBox.innerHTML = `
                <div class="signature-title">Signature ${type === 'responsable' ? 'Responsable' : 'Chef'}</div>
                <div class="signature-placeholder">
                    <i class="fas fa-pen-nib"></i>
                    Cliquez pour signer
                </div>
            `;
            signatureBox.classList.remove('has-signature');
        }
    }

    isCanvasEmpty() {
        if (!this.ctx) return true;

        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Check if all pixels are white (or transparent)
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // If pixel is not white or transparent, canvas has content
            if (a > 0 && (r !== 255 || g !== 255 || b !== 255)) {
                return false;
            }
        }

        return true;
    }

    getSignatures() {
        return this.signatures;
    }

    hasAllRequiredSignatures() {
        return this.signatures.responsable && this.signatures.chef;
    }

    reset() {
        this.signatures = {
            responsable: null,
            chef: null
        };
        
        // Update UI
        this.updateSignatureBox('responsable', null);
        this.updateSignatureBox('chef', null);
    }

    showToast(message, type = 'info') {
        // Create or update toast
        const toastContainer = document.getElementById('statusToast');
        if (toastContainer) {
            const toastBody = toastContainer.querySelector('.toast-body');
            toastBody.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-${this.getToastIcon(type)} me-2"></i>
                    <span>${message}</span>
                </div>
            `;
            
            // Add appropriate class
            toastContainer.className = `toast show bg-${type} text-white`;
            
            // Auto hide after 3 seconds
            setTimeout(() => {
                toastContainer.classList.remove('show');
            }, 3000);
        }
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

    cleanup() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentSignatureType = null;
    }
}

// Initialize signature pad when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.signaturePad = new SignaturePad();
});

console.log('✅ Signature Pad component loaded');