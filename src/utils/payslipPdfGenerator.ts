import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * Generates PDF payslip with professional layout and returns as base64 string
 * This function returns a Promise that resolves to a base64 string
 */
export async function generatePayslipPdf(payslipData: any, lines: any[], companyData?: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; // Increased margin for better spacing
  
  // Background color for header (very light gray) - Height reduced
  doc.setFillColor(248, 249, 250);
  doc.rect(0, 0, pageWidth, margin + 15, 'F'); // Smaller header height
  
  // Add header - company name and address from Odoo data in more compact format
  // Gunakan data perusahaan dari Odoo jika tersedia
  const companyName = companyData?.name || 'PT ARKANA SOLUSI DIGITAL';
  
  // Company name with more compact styling
  doc.setFontSize(12); // Smaller font size
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 77, 97); // Dark teal color for company name
  doc.text(companyName, margin, margin + 4); // Reduced Y position
  
  // Format alamat perusahaan dari data Odoo
  let addressLine = '';
  
  if (companyData) {
    // Alamat lengkap dari data perusahaan dalam satu baris
    if (companyData.street) {
      addressLine += companyData.street;
    }
    if (companyData.street2) {
      addressLine += addressLine ? `, ${companyData.street2}` : companyData.street2;
    }
    if (companyData.city) {
      addressLine += addressLine ? `, ${companyData.city}` : companyData.city;
    }
    if (companyData.zip) {
      addressLine += addressLine ? `, ${companyData.zip}` : companyData.zip;
    }
    if (companyData.country_id) {
      addressLine += addressLine ? `, ${companyData.country_id[1]}` : companyData.country_id[1];
    }
  } else {
    addressLine = 'Jl. Tebet Barat Dalam Raya No.35, Jakarta Selatan, Indonesia, 12810';
  }
  
  // Company address with compact styling
  doc.setFontSize(7); // Smaller font
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70); // Dark gray for address
  doc.text(addressLine, margin, margin + 8); // Reduced Y position
  
  // Contact information on same line
  if (companyData?.phone || companyData?.email) {
    let contactInfo = '';
    if (companyData.phone) contactInfo += `Tel: ${companyData.phone}`;
    if (companyData.email) contactInfo += contactInfo ? ` | Email: ${companyData.email}` : `Email: ${companyData.email}`;
    doc.setFontSize(7); // Small font size
    doc.text(contactInfo, margin, margin + 12); // Reduced Y position
  }
  
  // Add title and reference with better styling - Repositioned higher
  doc.setFillColor(0, 128, 128); // Teal color for title bar
  doc.rect(margin, margin + 18, pageWidth - 2 * margin, 8, 'F'); // Smaller height, higher position
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10); // Smaller text
  doc.setTextColor(255, 255, 255); // White text for title
  doc.text('SLIP GAJI / PAYSLIP', pageWidth / 2, margin + 24, {align: 'center'});
  
  // Add payslip information with better layout - Repositioned higher
  const infoStartY = margin + 32; // Reduced Y position
  doc.setFontSize(8); // Smaller font
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70); // Dark gray
  
  // Create a light gray background for employee information section
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, infoStartY - 3, pageWidth - 2 * margin, 22, 2, 2, 'F'); // Slightly smaller height
  
  // Employee information labels on the left
  doc.text('Nama Karyawan:', margin + 5, infoStartY);
  doc.text('Nomor Slip:', margin + 5, infoStartY + 6);
  doc.text('Periode:', margin + 5, infoStartY + 12);
  doc.text('Status:', margin + 5, infoStartY + 18);
  
  // Add employee information on the right with better styling
  const personName = payslipData.name.split('-')[1]?.trim() || 'Employee';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 77, 97); // Dark teal for values
  doc.text(personName, margin + 50, infoStartY);
  doc.text(payslipData.number, margin + 50, infoStartY + 6);
  doc.text(`${formatDate(payslipData.date_from)} - ${formatDate(payslipData.date_to)}`, margin + 50, infoStartY + 12);
  
  // Add status with color based on state
  const stateText = payslipData.state.charAt(0).toUpperCase() + payslipData.state.slice(1);
  if (stateText.toLowerCase() === 'done') {
    doc.setTextColor(40, 167, 69); // Green for done/paid
  } else if (stateText.toLowerCase() === 'cancel') {
    doc.setTextColor(220, 53, 69); // Red for cancelled
  } else {
    doc.setTextColor(255, 193, 7); // Yellow/orange for draft/waiting
  }
  doc.text(stateText, margin + 50, infoStartY + 18);
  
  // Separate additions, deductions, and contributions
  const additions = lines.filter(line => 
    line.amount !== 0 && 
    (['BASIC', 'PALW'].includes(line.code || ''))
  );
  
  // For deductions, handle tax components specially
  const nonTaxDeductions = lines.filter(line => {
    if (line.amount === 0) return false;
    
    const isNotTax = !(line.name && 
      (line.name.toLowerCase().includes('tax') || 
       line.name.toLowerCase().includes('pajak') || 
       line.name.toLowerCase().includes('pph')));
    
    return isNotTax && 
      (line.category_id && line.category_id[1].toLowerCase().includes('deduction')) ||
      (line.name && line.name.toLowerCase().includes('potongan'));
  });
  
  // Get one tax component
  let taxDeduction = null;
  for (const line of lines) {
    if (line.amount === 0) continue;
    
    if (line.code === 'INCOME_TAX') {
      taxDeduction = line;
      break;
    }
  }
  
  if (!taxDeduction) {
    for (const line of lines) {
      if (line.amount === 0) continue;
      
      if (line.code === 'TOTAL_INCTAX') {
        taxDeduction = line;
        break;
      }
    }
  }
  
  const deductions = taxDeduction ? [...nonTaxDeductions, taxDeduction] : nonTaxDeductions;
  
  // For company contributions
  const validCompanyCodes = ['BPJSCOMP', 'JKK', 'JKM', 'JPK', 'JHT_COMP'];
  const contributions = lines.filter(line => 
    line.amount !== 0 && 
    validCompanyCodes.includes(line.code || '')
  );
  
  // Calculate totals
  const totalAdditions = additions.reduce((sum, line) => sum + line.amount, 0);
  const totalDeductions = deductions.reduce((sum, line) => sum + line.amount, 0);
  const totalContributions = contributions.reduce((sum, line) => sum + line.amount, 0);
  
  // Starting position for the tables section - Move up to accommodate smaller header
  let yPos = margin + 60;
  
  if (additions.length > 0) {
    doc.setFillColor(0, 128, 128); // Teal color
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('PENGHASILAN / EARNINGS', margin + 5, yPos + 5);
    yPos += 10;
    
    // Draw table header
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.text('Komponen', margin + 5, yPos + 5);
    doc.text('Kategori', margin + 60, yPos + 5);
    doc.text('Jumlah', pageWidth - margin - 20, yPos + 5, {align: 'right'});
    yPos += 10;
    
    // Draw table rows
    doc.setFont('helvetica', 'normal');
    additions.forEach(line => {
      doc.text(line.name, margin + 5, yPos);
      doc.text(line.category_id ? line.category_id[1] : '-', margin + 60, yPos);
      doc.text(formatCurrency(line.amount), pageWidth - margin - 20, yPos, {align: 'right'});
      yPos += 5;
    });
    
    // Draw total
    yPos += 2;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Total Penghasilan', margin + 5, yPos + 5);
    doc.text(formatCurrency(totalAdditions), pageWidth - margin - 20, yPos + 5, {align: 'right'});
    yPos += 12;
  }
  
  // Draw deductions section
  if (deductions.length > 0) {
    doc.setFillColor(220, 53, 69); // Red color
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('POTONGAN / DEDUCTIONS', margin + 5, yPos + 5);
    yPos += 10;
    
    // Draw table header
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.text('Komponen', margin + 5, yPos + 5);
    doc.text('Kategori', margin + 60, yPos + 5);
    doc.text('Jumlah', pageWidth - margin - 20, yPos + 5, {align: 'right'});
    yPos += 10;
    
    // Draw table rows
    doc.setFont('helvetica', 'normal');
    deductions.forEach(line => {
      doc.text(line.name, margin + 5, yPos);
      doc.text(line.category_id ? line.category_id[1] : '-', margin + 60, yPos);
      doc.text(formatCurrency(line.amount), pageWidth - margin - 20, yPos, {align: 'right'});
      yPos += 5;
    });
    
    // Draw total
    yPos += 2;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Total Potongan', margin + 5, yPos + 5);
    doc.text(formatCurrency(totalDeductions), pageWidth - margin - 20, yPos + 5, {align: 'right'});
    yPos += 12;
  }
  
  // Draw contributions section
  if (contributions.length > 0) {
    doc.setFillColor(108, 117, 125); // Gray color
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('KONTRIBUSI PERUSAHAAN / COMPANY CONTRIBUTIONS', margin + 5, yPos + 5);
    yPos += 10;
    
    // Draw table header
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.text('Komponen', margin + 5, yPos + 5);
    doc.text('Kategori', margin + 60, yPos + 5);
    doc.text('Jumlah', pageWidth - margin - 20, yPos + 5, {align: 'right'});
    yPos += 10;
    
    // Draw table rows
    doc.setFont('helvetica', 'normal');
    contributions.forEach(line => {
      doc.text(line.name, margin + 5, yPos);
      doc.text(line.category_id ? line.category_id[1] : '-', margin + 60, yPos);
      doc.text(formatCurrency(line.amount), pageWidth - margin - 20, yPos, {align: 'right'});
      yPos += 5;
    });
    
    // Draw total
    yPos += 2;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Total Kontribusi', margin + 5, yPos + 5);
    doc.text(formatCurrency(totalContributions), pageWidth - margin - 20, yPos + 5, {align: 'right'});
    yPos += 12;
  }
  
  // Draw net salary box with solid color (more reliable than gradient)
  yPos += 5; // Add more space before net salary
  
  // Create a prominent box for net salary
  doc.setFillColor(0, 128, 128); // Teal background
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 14, 2, 2, 'F');
  
  // Add the net salary text and value in white
  doc.setTextColor(255, 255, 255); 
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11); // Slightly larger for emphasis
  doc.text('GAJI BERSIH / NET SALARY', margin + 5, yPos + 10);
  doc.text(formatCurrency(payslipData.net_wage), pageWidth - margin - 5, yPos + 10, {align: 'right'});
  
  // Reset font size
  doc.setFontSize(10);
  yPos += 24; // Add space after net salary section
  
  // Add signature section with more compact styling
  // Create a very small light gray background for footer area only
  doc.setFillColor(248, 249, 250);
  doc.rect(0, pageHeight - margin - 25, pageWidth, 25, 'F');
  
  // Generate QR code for digital signature
  // QR code contains employee name, payslip number, and date
  const qrData = `${personName} - ${payslipData.number} - ${formatDate(payslipData.date_to)}`;
  
  // Generate smaller QR code at bottom left corner
  const qrSize = 25; // Smaller QR code
  
  // Create a QR Code as DataURL
  try {
    // Since we've made the parent function async, we can now await the promise
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: qrSize * 4 // Higher resolution for better quality
    });
    
    // Add QR code with light background and border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin - 2, pageHeight - margin - qrSize - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
    
    // Add QR code image
    doc.addImage(qrDataUrl, 'PNG', margin, pageHeight - margin - qrSize, qrSize, qrSize);
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback if QR code generation fails
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, pageHeight - margin - qrSize, qrSize, qrSize, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text('QR Code unavailable', margin + qrSize/2, pageHeight - margin - qrSize/2, { align: 'center' });
  }
  
  // Add date on the right with smaller font
  doc.setTextColor(70, 70, 70);
  doc.setFontSize(7);
  doc.text('Jakarta, ' + new Date().toLocaleDateString('id-ID', {
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  }), pageWidth - margin - 5, pageHeight - margin - qrSize + 5, { align: 'right' });
  
  // Company name and verification text with smaller font
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 77, 97); // Dark teal for company name
  
  // Gunakan nama perusahaan dari data Odoo atau fallback ke nilai default
  const signatureCompanyName = companyData?.name || 'PT Arkana Solusi Digital';
  doc.text(signatureCompanyName, margin + qrSize + 5, pageHeight - margin - qrSize + 5);
  
  // Add verification text - single line, more compact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(70, 70, 70);
  doc.text('Slip gaji ini telah diverifikasi secara elektronik', margin + qrSize + 5, pageHeight - margin - qrSize + 11);
  
  // Add footer with disclaimer and page number - smaller font
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text('Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah', pageWidth / 2, pageHeight - 5, {align: 'center'});
  doc.text('Halaman 1 dari 1', pageWidth - margin, pageHeight - 5, {align: 'right'});
  
  // Return the PDF as base64 string
  return doc.output('datauristring');
}