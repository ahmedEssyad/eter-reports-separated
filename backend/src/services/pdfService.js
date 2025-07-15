/**
 * PDF Service
 * Handles PDF generation for reports
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { Form } = require('../models');
const { APIError } = require('../middleware/error');
const logger = require('../utils/logger');

/**
 * Generate single report PDF
 */
const generateSingleReportPDF = async (formId) => {
    const form = await Form.findOne({ id: formId });
    
    if (!form) {
        throw new APIError('Form not found', 404, 'FORM_NOT_FOUND');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    
    // Generate PDF content
    generateReportPDFContent(doc, form);
    
    return { doc, form };
};

/**
 * Generate multiple reports PDF
 */
const generateMultipleReportsPDF = async (formIds) => {
    const forms = await Form.find({ id: { $in: formIds } }).sort({ date: -1 });
    
    if (forms.length === 0) {
        throw new APIError('No forms found', 404, 'FORMS_NOT_FOUND');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    
    // Cover page
    generateCoverPage(doc, forms);
    
    // Generate each report
    forms.forEach((form, index) => {
        if (index > 0) {
            doc.addPage();
        }
        generateReportPDFContent(doc, form);
    });
    
    return { doc, forms };
};

/**
 * Generate reports by date range PDF
 */
const generateDateRangeReportsPDF = async (startDate, endDate, filters = {}) => {
    const forms = await Form.findByDateRange(startDate, endDate, filters);
    
    if (forms.length === 0) {
        throw new APIError('No forms found for the specified date range', 404, 'NO_FORMS_IN_RANGE');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    
    // Cover page with date range info
    generateDateRangeCoverPage(doc, forms, startDate, endDate, filters);
    
    // Generate each report
    forms.forEach((form, index) => {
        doc.addPage();
        generateReportPDFContent(doc, form);
    });
    
    return { doc, forms };
};

/**
 * Generate summary report PDF
 */
const generateSummaryReportPDF = async (startDate, endDate, filters = {}) => {
    const forms = await Form.findByDateRange(startDate, endDate, filters);
    const statistics = await Form.getStatistics({ 
        startDate, 
        endDate, 
        ...filters 
    });
    
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold')
       .text('ETER - Rapport de Synthèse', { align: 'center' });
    
    doc.fontSize(12).font('Helvetica')
       .text(`Période: ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`, 
             { align: 'center' });
    
    doc.moveDown(2);
    
    // Statistics section
    generateStatisticsSection(doc, statistics, forms);
    
    // Summary table
    generateSummaryTable(doc, forms);
    
    return { doc, statistics };
};

/**
 * Generate PDF content for a single report
 */
const generateReportPDFContent = (doc, form) => {
    // Reset margins for new page
    const margin = 20;
    let currentY = margin;
    
    // Main border
    doc.rect(margin, margin, 555, 750).stroke();
    
    // Header
    doc.rect(margin, currentY, 555, 60).stroke();
    doc.fontSize(12).font('Helvetica-Bold')
       .text("Établissement des Travaux d'Entretien Routier -ETER-", 
             margin + 10, currentY + 15, { align: 'center', width: 535 });
    
    doc.fontSize(10).font('Helvetica-Oblique')
       .text("Direction des Approvisionnements et Logistique -DAL-", 
             margin + 10, currentY + 35, { align: 'center', width: 535 });
    
    currentY += 70;
    
    // Title with report number
    doc.rect(margin, currentY, 555, 30).stroke();
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Rapport Journalier', margin + 10, currentY + 8, { width: 400 });
    doc.fontSize(10)
       .text(`N° ${form.id}`, margin + 420, currentY + 12);
    
    currentY += 40;
    
    // General information section
    generateGeneralInfoSection(doc, form, currentY, margin);
    currentY += 110;
    
    // Vehicles table
    generateVehiclesTable(doc, form, currentY, margin);
    currentY += 340;
    
    // Signatures section
    generateSignaturesSection(doc, form, currentY, margin);
};

/**
 * Generate general information section
 */
const generateGeneralInfoSection = (doc, form, startY, margin) => {
    let currentY = startY;
    
    // First row
    const row1Fields = [
        { label: 'Entrée', value: form.entree, width: 170 },
        { label: 'Origine', value: form.origine, width: 170 },
        { label: 'Matricule CCG', value: form.vehicles[0]?.matricule || '', width: 95 },
        { label: 'Date', value: new Date(form.date).toLocaleDateString('fr-FR'), width: 120 }
    ];
    
    generateInfoRow(doc, row1Fields, currentY, margin);
    currentY += 25;
    
    // Second row
    const row2Fields = [
        { label: 'Dépôt', value: form.depot, width: 170 },
        { label: 'Chantier', value: form.chantier, width: 170 },
        { label: 'Stock Début', value: form.stockDebut?.toString() || '0', width: 95 },
        { label: 'Stock Fin', value: form.stockFin?.toString() || '0', width: 60 },
        { label: 'Sortie Gasoil', value: form.sortieGasoil?.toString() || '0', width: 60 }
    ];
    
    generateInfoRow(doc, row2Fields, currentY, margin);
    currentY += 25;
    
    // Third row
    const row3Fields = [
        { label: '', value: '', width: 340 },
        { label: 'Début Index', value: form.debutIndex?.toString() || '', width: 95 },
        { label: 'Fin Index', value: form.finIndex?.toString() || '', width: 120 }
    ];
    
    generateInfoRow(doc, row3Fields, currentY, margin);
};

/**
 * Generate information row
 */
const generateInfoRow = (doc, fields, y, margin) => {
    let x = margin;
    
    fields.forEach(field => {
        doc.rect(x, y, field.width, 25).stroke();
        
        if (field.label) {
            doc.fontSize(8).font('Helvetica-Bold')
               .text(field.label, x + 5, y + 3);
            doc.fontSize(8).font('Helvetica')
               .text(field.value, x + 5, y + 12);
        }
        
        x += field.width;
    });
};

/**
 * Generate vehicles table
 */
const generateVehiclesTable = (doc, form, startY, margin) => {
    const headers = ['Matricule', 'Nom Chauffeur', 'Signature', 'Heure Revif', 'Qté Livrée', 'Lieu de Comptage', 'Compteur'];
    const colWidths = [70, 90, 60, 70, 70, 80, 75];
    
    let currentY = startY;
    let x = margin;
    
    // Table headers
    headers.forEach((header, i) => {
        doc.rect(x, currentY, colWidths[i], 25).stroke();
        doc.fontSize(8).font('Helvetica-Bold')
           .text(header, x + 2, currentY + 8, { 
               width: colWidths[i] - 4, 
               align: 'center' 
           });
        x += colWidths[i];
    });
    
    currentY += 25;
    
    // Table rows (15 rows total to match original format)
    const maxRows = 15;
    let totalQuantity = 0;
    
    for (let i = 0; i < maxRows; i++) {
        x = margin;
        const vehicle = form.vehicles[i] || {};
        
        const rowData = [
            vehicle.matricule || '',
            vehicle.chauffeur || '',
            '', // Signature column (empty)
            vehicle.heureRevif || '',
            vehicle.quantiteLivree?.toString() || '',
            vehicle.lieuComptage || '',
            '' // Compteur column (empty)
        ];
        
        if (vehicle.quantiteLivree) {
            totalQuantity += vehicle.quantiteLivree;
        }
        
        rowData.forEach((cell, j) => {
            doc.rect(x, currentY, colWidths[j], 20).stroke();
            doc.fontSize(8).font('Helvetica')
               .text(cell, x + 2, currentY + 6, { 
                   width: colWidths[j] - 4, 
                   align: 'center' 
               });
            x += colWidths[j];
        });
        
        currentY += 20;
    }
    
    return totalQuantity;
};

/**
 * Generate signatures section
 */
const generateSignaturesSection = (doc, form, startY, margin) => {
    const totalQuantity = form.totalFuelDelivered;
    
    // Separator line
    doc.moveTo(margin, startY).lineTo(margin + 555, startY).stroke();
    
    // Signature labels
    doc.fontSize(9).font('Helvetica')
       .text('Signature Responsable', margin + 30, startY + 15)
       .text(`Total: ${totalQuantity}L`, margin + 250, startY + 15)
       .text('Signature Chef', margin + 450, startY + 15);
    
    // Add actual signatures if available
    if (form.signatureUrlResponsable) {
        try {
            const sigPath = path.join(__dirname, '../../uploads', 
                form.signatureUrlResponsable.replace('/uploads/', ''));
            if (fs.existsSync(sigPath)) {
                doc.image(sigPath, margin + 30, startY + 30, { width: 120, height: 60 });
            }
        } catch (error) {
            logger.warn('Could not load supervisor signature image', { 
                formId: form.id, 
                error: error.message 
            });
        }
    }
    
    if (form.signatureUrlChef) {
        try {
            const sigPath = path.join(__dirname, '../../uploads', 
                form.signatureUrlChef.replace('/uploads/', ''));
            if (fs.existsSync(sigPath)) {
                doc.image(sigPath, margin + 420, startY + 30, { width: 120, height: 60 });
            }
        } catch (error) {
            logger.warn('Could not load chief signature image', { 
                formId: form.id, 
                error: error.message 
            });
        }
    }
};

/**
 * Generate cover page for multiple reports
 */
const generateCoverPage = (doc, forms) => {
    doc.fontSize(24).font('Helvetica-Bold')
       .text('ETER - Rapports Journaliers', { align: 'center' });
    
    doc.fontSize(18).font('Helvetica')
       .text('Compilation des Rapports', { align: 'center' });
    
    doc.moveDown(2);
    
    doc.fontSize(14)
       .text(`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' })
       .text(`Nombre de rapports: ${forms.length}`, { align: 'center' });
    
    doc.moveDown(2);
    
    // Summary table
    doc.fontSize(12).font('Helvetica-Bold')
       .text('Résumé:', { align: 'left' });
    
    forms.slice(0, 10).forEach((form, index) => {
        doc.fontSize(10).font('Helvetica')
           .text(`${index + 1}. ${form.id} - ${form.depot} - ${new Date(form.date).toLocaleDateString('fr-FR')}`);
    });
    
    if (forms.length > 10) {
        doc.fontSize(10).font('Helvetica-Oblique')
           .text(`... et ${forms.length - 10} autres rapports`);
    }
    
    doc.addPage();
};

/**
 * Generate date range cover page
 */
const generateDateRangeCoverPage = (doc, forms, startDate, endDate, filters) => {
    doc.fontSize(24).font('Helvetica-Bold')
       .text('ETER - Rapports par Période', { align: 'center' });
    
    doc.moveDown();
    
    doc.fontSize(16)
       .text(`Du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`, 
             { align: 'center' });
    
    doc.moveDown(2);
    
    if (filters.depot) {
        doc.fontSize(14)
           .text(`Dépôt: ${filters.depot}`, { align: 'center' });
    }
    
    doc.fontSize(14)
       .text(`Nombre de rapports: ${forms.length}`, { align: 'center' });
    
    doc.moveDown(2);
    
    // Generate summary statistics
    const totalFuel = forms.reduce((sum, form) => sum + (form.totalFuelDelivered || 0), 0);
    const totalVehicles = forms.reduce((sum, form) => sum + form.vehicleCount, 0);
    
    doc.fontSize(12).font('Helvetica-Bold')
       .text('Statistiques de la période:', { align: 'left' });
    
    doc.fontSize(11).font('Helvetica')
       .text(`• Total carburant distribué: ${Math.round(totalFuel)} L`)
       .text(`• Total véhicules: ${totalVehicles}`)
       .text(`• Moyenne par rapport: ${Math.round(totalFuel / forms.length)} L`);
};

/**
 * Generate statistics section for summary report
 */
const generateStatisticsSection = (doc, statistics, forms) => {
    doc.fontSize(16).font('Helvetica-Bold')
       .text('Statistiques Générales');
    
    doc.moveDown();
    
    const stats = [
        [`Nombre total de rapports`, statistics.totalReports],
        [`Carburant total distribué`, `${statistics.totalFuelDelivered} L`],
        [`Nombre de véhicules`, statistics.totalVehicles],
        [`Conducteurs uniques`, statistics.uniqueDriversCount],
        [`Moyenne véhicules/rapport`, statistics.avgVehiclesPerReport]
    ];
    
    stats.forEach(([label, value]) => {
        doc.fontSize(12).font('Helvetica')
           .text(`${label}: `, { continued: true })
           .font('Helvetica-Bold')
           .text(value.toString());
    });
    
    doc.moveDown(2);
};

/**
 * Generate summary table
 */
const generateSummaryTable = (doc, forms) => {
    doc.fontSize(16).font('Helvetica-Bold')
       .text('Détail des Rapports');
    
    doc.moveDown();
    
    // Table headers
    const headers = ['Date', 'Dépôt', 'Véhicules', 'Carburant (L)', 'Statut'];
    const colWidths = [80, 150, 80, 100, 80];
    let x = 50;
    let y = doc.y;
    
    headers.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], 20).stroke();
        doc.fontSize(10).font('Helvetica-Bold')
           .text(header, x + 5, y + 5, { width: colWidths[i] - 10 });
        x += colWidths[i];
    });
    
    y += 20;
    
    // Table rows
    forms.forEach(form => {
        x = 50;
        
        const rowData = [
            new Date(form.date).toLocaleDateString('fr-FR'),
            form.depot,
            form.vehicleCount.toString(),
            Math.round(form.totalFuelDelivered).toString(),
            form.status
        ];
        
        rowData.forEach((cell, i) => {
            doc.rect(x, y, colWidths[i], 15).stroke();
            doc.fontSize(9).font('Helvetica')
               .text(cell, x + 2, y + 3, { width: colWidths[i] - 4 });
            x += colWidths[i];
        });
        
        y += 15;
        
        // Add new page if needed
        if (y > 750) {
            doc.addPage();
            y = 50;
        }
    });
};

module.exports = {
    generateSingleReportPDF,
    generateMultipleReportsPDF,
    generateDateRangeReportsPDF,
    generateSummaryReportPDF
};