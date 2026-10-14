import { jsPDF } from 'jspdf';
import { PropertyAccountantReportPayload } from '@/modules/properties/domain/accountant-report-types';
import { formatCurrency } from '@/lib/format/currency';

export function generateATOPropertyPdf(data: PropertyAccountantReportPayload): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header - Black & White Official ATO Style
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('AUSTRALIAN TAXATION OFFICE', margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.text(`RENTAL PROPERTY SCHEDULE — ${data.financialYearLabel.toUpperCase()}`, margin, y);
  y += 4;

  doc.setLineWidth(0.6);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  // Property & Ownership Information
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Property Name: ${data.property.name}`, margin, y);
  y += 4.5;
  doc.text(`Address: ${data.property.address}`, margin, y);
  y += 4.5;
  doc.text(`Property Type: ${data.property.propertyType}    |    Ownership: ${data.atoForm.ownershipPercentage}%    |    First Year Rented: —`, margin, y);
  y += 6;

  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  // Section 1: Rental Income
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. RENTAL INCOME', margin, y);
  y += 5;

  const drawRow = (label: string, value: string, isBold: boolean = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(label, margin + 4, y);
    doc.text(value, margin + contentWidth - 4, y, { align: 'right' });
    y += 5;
  };

  drawRow('Gross rent received', formatCurrency(data.atoForm.rentalIncome.grossRent));
  drawRow('Other rental-related income', '—');
  doc.setLineWidth(0.2);
  doc.line(margin + 4, y, margin + contentWidth, y);
  y += 3.5;
  drawRow('Total Gross Rental Income', formatCurrency(data.atoForm.rentalIncome.totalGrossRentalIncome), true);
  y += 4;

  // Section 2: Rental Deductions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. RENTAL EXPENSES & DEDUCTIONS', margin, y);
  y += 5;

  for (const item of data.atoForm.deductions) {
    const valStr = item.amount !== null ? formatCurrency(item.amount) : '—';
    drawRow(item.name, valStr);
  }

  doc.setLineWidth(0.2);
  doc.line(margin + 4, y, margin + contentWidth, y);
  y += 3.5;
  drawRow('Total Deductions / Expenses', formatCurrency(data.atoForm.totalDeductions), true);
  y += 6;

  // Section 3: Net Rental Income / Loss
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. NET RENTAL INCOME (LOSS)', margin, y);
  doc.text(formatCurrency(data.atoForm.netRentalIncome), margin + contentWidth, y, { align: 'right' });
  y += 7;

  // Investor Yield Summary Box
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, 24);
  y += 5;
  doc.setFontSize(9);
  doc.text('INVESTOR PERFORMANCE SUMMARY', margin + 4, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Estimated Property Value: ${formatCurrency(data.performance.propertyValue)}`, margin + 4, y);
  doc.text(`Gross Rental Yield: ${data.performance.grossYield}%`, margin + 80, y);
  y += 4.5;
  doc.text(`Net Cashflow Position: ${formatCurrency(data.performance.netCashPosition)}`, margin + 4, y);
  doc.text(`Net Rental Yield: ${data.performance.netYield}%`, margin + 80, y);
  y += 4.5;
  doc.text(`Expense to Rent Ratio: ${data.performance.expenseRatio}%`, margin + 4, y);
  y += 10;

  // Footer / Accountant Verification Declaration
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('This schedule is prepared from verified PropertyLedge transaction records for Australian tax reporting purposes.', margin, 282);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}  |  PropertyLedge ATO Compliance Module`, margin, 286);

  return Buffer.from(doc.output('arraybuffer'));
}
