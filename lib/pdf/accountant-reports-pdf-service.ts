import { jsPDF } from 'jspdf';
import {
  ComparativeStatementData,
  RentalScheduleData,
} from '@/modules/finance/domain/accountant-reports-models';
import { formatAccountingAmount } from '@/lib/finance/accountant-reports-consolidated-service';
import {
  A4_PAGE_WIDTH,
  A4_PAGE_HEIGHT,
  STANDARD_MARGIN,
  CONTENT_WIDTH,
  createStandardPdfDocument,
  stampReportFooters,
} from './report-engine';

// Precise styling palette matching Reference Image 3 (Comparative Statement) and Images 1 & 2 (Rental Schedule)
const COLOR_NAVY = [10, 37, 64] as const;        // #0A2540
const COLOR_DARK = [15, 23, 42] as const;        // #0F172A
const COLOR_MUTED = [100, 116, 139] as const;    // #64748B
const COLOR_BORDER = [203, 213, 225] as const;   // #CBD5E1
const COLOR_YELLOW_HEADER = [252, 246, 195] as const; // #FCF6C3 Light warm yellow/cream from screenshot
const COLOR_YELLOW_ROW = [254, 250, 224] as const;    // #FEFAE0 Very light cream
const COLOR_BLUE_HIGHLIGHT = [224, 238, 250] as const; // #E0EEFA Light blue highlight for ATO gross rent / totals
const COLOR_WHITE = [255, 255, 255] as const;

/**
 * Generates the Comparative Statement PDF matching Reference Image 3
 */
export async function generateComparativeStatementPdf(
  data: ComparativeStatementData
): Promise<Uint8Array> {
  const doc = createStandardPdfDocument({
    title: `Comparative Statement - ${data.property.name || data.property.addressLine1}`,
    subject: `Financial Comparison between ${data.selectedFy} and ${data.previousFy}`,
  });

  const margin = STANDARD_MARGIN;
  const contentWidth = CONTENT_WIDTH;
  let y = 16;

  // 1. Top Header Box with Yellow Background (matching Image 3)
  const headerHeight = 12;
  doc.setFillColor(...COLOR_YELLOW_HEADER);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, contentWidth, headerHeight, 'FD');

  // Vertical column dividers in header
  const col1Width = 100; // Category column
  const col2Width = 26;  // Current FY
  const col3Width = 26;  // Previous FY
  const col4Width = contentWidth - col1Width - col2Width - col3Width; // 28 mm for Variance

  const colX0 = margin;
  const colX1 = margin + col1Width;
  const colX2 = colX1 + col2Width;
  const colX3 = colX2 + col3Width;
  const colX4 = margin + contentWidth;

  doc.line(colX1, y, colX1, y + headerHeight);
  doc.line(colX2, y, colX2, y + headerHeight);
  doc.line(colX3, y, colX3, y + headerHeight);

  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  doc.text('COMPARATIVE STATEMENT', colX0 + 3, y + 8);

  doc.setFontSize(9.5);
  doc.text(data.selectedFy, colX1 + col2Width - 3, y + 8, { align: 'right' });
  doc.text(data.previousFy, colX2 + col3Width - 3, y + 8, { align: 'right' });
  doc.text('Variance', colX3 + col4Width - 3, y + 8, { align: 'right' });

  y += headerHeight;

  // 2. Subheader Box (Property / Ownership note)
  const subheaderHeight = 13;
  doc.setFillColor(...COLOR_YELLOW_ROW);
  doc.rect(margin, y, contentWidth, subheaderHeight, 'FD');
  doc.line(colX1, y, colX1, y + subheaderHeight);
  doc.line(colX2, y, colX2, y + subheaderHeight);
  doc.line(colX3, y, colX3, y + subheaderHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 20, 20); // Red note label from screenshot "Note 1 - 100% ownership"
  doc.text(`Note 1  -  ${data.property.ownershipPercentage}% ownership`, colX0 + 3, y + 5);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  const lotIdentifier = data.property.lotUnitIdentifier || 'Lot 5';
  doc.text(lotIdentifier, colX1 - 4, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const fullAddress = `${data.property.addressLine1}, ${data.property.city} ${data.property.state} ${data.property.postalCode}`;
  doc.text(fullAddress, colX0 + 3, y + 10);

  y += subheaderHeight;

  // Helper to draw a table row
  const drawRow = (
    label: string,
    curVal: string,
    prevVal: string,
    varVal: string,
    options?: {
      isBold?: boolean;
      isSectionHeader?: boolean;
      bgYellow?: boolean;
      indent?: number;
      topBorder?: boolean;
      bottomBorder?: boolean;
      doubleBottomBorder?: boolean;
    }
  ) => {
    const rowH = 6;
    if (options?.bgYellow) {
      doc.setFillColor(...COLOR_YELLOW_HEADER);
      doc.rect(margin, y, contentWidth, rowH, 'FD');
    } else {
      doc.setFillColor(...COLOR_WHITE);
      doc.rect(margin, y, contentWidth, rowH, 'F');
    }

    // Outer and vertical borders
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(colX0, y, colX0, y + rowH);
    doc.line(colX1, y, colX1, y + rowH);
    doc.line(colX2, y, colX2, y + rowH);
    doc.line(colX3, y, colX3, y + rowH);
    doc.line(colX4, y, colX4, y + rowH);

    if (options?.topBorder) {
      doc.line(margin, y, margin + contentWidth, y);
    }
    if (options?.bottomBorder) {
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH);
    }
    if (options?.doubleBottomBorder) {
      doc.setLineWidth(0.5);
      doc.line(margin, y + rowH, margin + contentWidth, y + rowH);
      doc.line(margin, y + rowH + 0.6, margin + contentWidth, y + rowH + 0.6);
    }

    doc.setFont('helvetica', options?.isBold ? 'bold' : 'normal');
    doc.setFontSize(options?.isSectionHeader ? 8.5 : 8);
    doc.setTextColor(0, 0, 0);

    const xOffset = options?.indent ? colX0 + 3 + options.indent : colX0 + 3;
    doc.text(label, xOffset, y + 4.3);

    if (!options?.isSectionHeader) {
      doc.text(curVal, colX1 + col2Width - 3, y + 4.3, { align: 'right' });
      doc.text(prevVal, colX2 + col3Width - 3, y + 4.3, { align: 'right' });
      doc.text(varVal, colX3 + col4Width - 3, y + 4.3, { align: 'right' });
    }

    y += rowH;
  };

  // 3. INCOME Section
  drawRow('INCOME', '', '', '', { isBold: true, isSectionHeader: true });
  data.incomeRows.forEach((item) => {
    drawRow(
      item.category,
      formatAccountingAmount(item.currentAmount),
      formatAccountingAmount(item.previousAmount),
      formatAccountingAmount(item.variance),
      { indent: 4 }
    );
  });

  // Empty separator row in Income
  drawRow('—', '—', '—', '—', { bottomBorder: true });

  // 4. LESS: EXPENSES Section
  drawRow('LESS: EXPENSES', '', '', '', { isBold: true, isSectionHeader: true });
  data.expenseRows.forEach((item) => {
    drawRow(
      item.category,
      formatAccountingAmount(item.currentAmount),
      formatAccountingAmount(item.previousAmount),
      formatAccountingAmount(item.variance),
      { indent: 4 }
    );
  });

  // Subtotal Expenses
  drawRow(
    'Total Expenses',
    formatAccountingAmount(data.totalExpensesCurrent),
    formatAccountingAmount(data.totalExpensesPrevious),
    formatAccountingAmount(data.totalExpensesVariance),
    { isBold: true, topBorder: true, bottomBorder: true }
  );

  // 5. NET RENTAL PROPERTY PROFIT/(LOSS) - Yellow Row with double bottom border
  drawRow(
    'NET RENTAL PROPERTY PROFIT/(LOSS)',
    formatAccountingAmount(data.netRentalResultCurrent),
    formatAccountingAmount(data.netRentalResultPrevious),
    formatAccountingAmount(data.netRentalResultVariance),
    {
      isBold: true,
      bgYellow: true,
      topBorder: true,
      doubleBottomBorder: true,
    }
  );

  y += 10;

  // 6. Summary KPI Box below table (Prompt Section 3.5)
  const summaryBoxH = 26;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, summaryBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text('EXECUTIVE VARIANCE ANALYSIS & SUMMARY', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...COLOR_DARK);

  const narrativeText = data.summary.narrative ||
    `Net rental position moved across the comparison period. Total rental income is ${formatAccountingAmount(data.totalIncomeCurrent, true)} against deductible expenses of ${formatAccountingAmount(data.totalExpensesCurrent, true)}.`;
  
  const splitNarrative = doc.splitTextToSize(narrativeText, contentWidth - 8);
  doc.text(splitNarrative, margin + 4, y + 12);

  doc.setFont('helvetica', 'bold');
  const varianceTag = `Net Rental Result Variance: ${data.summary.netRentalVarianceFormatted} (${data.summary.hasImprovement ? 'Positive Improvement' : 'Increased Net Outlay'})`;
  doc.text(varianceTag, margin + 4, y + 21);

  stampReportFooters(doc, {
    systemLabel: 'PropertyLedge — Comparative Statement & Annual Ledger Reconciliation',
    customFooterText: 'Prepared for Australian Property Accounting & Tax Review',
  });

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

/**
 * Generates the Australian Individual Tax Return Rental Schedule PDF matching Reference Images 1 & 2
 */
export async function generateRentalSchedulePdf(
  data: RentalScheduleData
): Promise<Uint8Array> {
  const doc = createStandardPdfDocument({
    title: `Rental Schedule - ${data.property.name || data.property.addressLine1}`,
    subject: `ATO Rental Schedule (Item 21) for ${data.taxYearLabel}`,
  });

  const margin = STANDARD_MARGIN;
  const contentWidth = CONTENT_WIDTH;
  let y = 14;

  // Header Title matching Image 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('INDIVIDUAL TAX RETURN', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const ownerLabel = data.sectionC.owners[0]?.name || 'Property Owner';
  doc.text(ownerLabel, margin + contentWidth, y, { align: 'right' });

  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_DARK);
  doc.text(`Rental schedule — ${data.sectionA.address}, ${data.sectionA.city} ${data.sectionA.state} ${data.sectionA.postcode}`, margin, y);

  y += 5;

  // Address sub-table
  const addrColWidth = contentWidth / 4;
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentWidth, y);
  y += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Address', margin, y);
  doc.text('Town/City', margin + addrColWidth, y);
  doc.text('State', margin + addrColWidth * 2, y);
  doc.text('Postcode', margin + addrColWidth * 3, y);

  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text(data.sectionA.address, margin, y);
  doc.text(data.sectionA.city, margin + addrColWidth, y);
  doc.text(data.sectionA.state, margin + addrColWidth * 2, y);
  doc.text(data.sectionA.postcode, margin + addrColWidth * 3, y);

  y += 3;
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  // Section A: Property details
  const drawSectionAItem = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + contentWidth, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3.2;
  };

  drawSectionAItem('Name of property', data.sectionA.propertyName);
  drawSectionAItem('Date property first earned rental income', data.sectionA.dateFirstEarnedRentalIncome || '—');
  drawSectionAItem('Number of weeks property was rented this year', String(data.sectionA.weeksRentedThisYear));
  drawSectionAItem('The number of weeks the property was available for rent this year', String(data.sectionA.weeksAvailableForRentThisYear));
  drawSectionAItem("Entity's % ownership", `${data.sectionA.ownershipPercentage}%`);
  drawSectionAItem('Has the loan for the property been renegotiated this year?', data.sectionA.loanRenegotiated);

  y += 2;

  // Section B: Acquisitions and Disposal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Acquisitions and Disposal', margin, y);
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Date', margin + contentWidth - 36, y, { align: 'right' });
  doc.text('Amount', margin + contentWidth, y, { align: 'right' });
  y += 2.5;
  doc.setDrawColor(...COLOR_BORDER);
  doc.line(margin, y, margin + contentWidth, y);
  y += 3.5;

  const drawSectionBItem = (label: string, dateVal?: string | null, amtVal?: number | null) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(label, margin, y);
    if (dateVal) {
      doc.text(dateVal, margin + contentWidth - 36, y, { align: 'right' });
    }
    if (amtVal !== undefined && amtVal !== null) {
      doc.setFont('helvetica', 'bold');
      doc.text(formatAccountingAmount(amtVal, true), margin + contentWidth, y, { align: 'right' });
    } else {
      doc.text('—', margin + contentWidth, y, { align: 'right' });
    }
    y += 2;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3.2;
  };

  drawSectionBItem('Acquisition', data.sectionB.acquisitionDate, data.sectionB.acquisitionAmount);
  drawSectionBItem('Disposal', data.sectionB.disposalDate, data.sectionB.disposalAmount);
  drawSectionBItem('Capital gain/loss on sale of this property', null, data.sectionB.capitalGainLoss);
  drawSectionBItem('Value of capital allowances (depreciation on plant) recouped on the sale of the property', null, data.sectionB.capitalAllowancesRecouped);
  drawSectionBItem('Value of capital works deductions (special building write-off) recouped on the sale of the property', null, data.sectionB.capitalWorksRecouped);

  y += 2;

  // Section C: Owners
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Owners', margin, y);
  y += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Name', margin, y);
  doc.text('TFN', margin + contentWidth - 40, y);
  doc.text('Percentage', margin + contentWidth, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(...COLOR_BORDER);
  doc.line(margin, y, margin + contentWidth, y);
  y += 3.5;

  data.sectionC.owners.forEach((owner) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(owner.name, margin, y);
    doc.text(owner.tfnStatus, margin + contentWidth - 40, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${owner.percentage}%`, margin + contentWidth, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3.5;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`${data.sectionC.totalPercentage}%`, margin + contentWidth, y, { align: 'right' });
  y += 2;
  doc.setDrawColor(...COLOR_BORDER);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  // Section D: Income / Expenses (matching Image 1 & 2)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Income / Expenses', margin, y);
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text('Gross', margin + contentWidth - 30, y, { align: 'right' });
  doc.text('share', margin + contentWidth, y, { align: 'right' });
  y += 2.5;
  doc.line(margin, y, margin + contentWidth, y);
  y += 3.5;

  const drawScheduleRow = (
    label: string,
    code: string,
    gross: number | null | undefined,
    share: number | null | undefined,
    options?: {
      isHeader?: boolean;
      isHighlighted?: boolean;
      isBold?: boolean;
    }
  ) => {
    const rowH = 5.2;

    if (options?.isHighlighted) {
      doc.setFillColor(...COLOR_BLUE_HIGHLIGHT);
      doc.rect(margin, y - 3.2, contentWidth, rowH, 'F');
    }

    doc.setFont('helvetica', options?.isBold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(label, margin, y);

    const grossStr = formatAccountingAmount(gross);
    const shareStr = formatAccountingAmount(share);

    doc.text(grossStr, margin + contentWidth - 30, y, { align: 'right' });
    doc.text(shareStr, margin + contentWidth, y, { align: 'right' });

    y += 1.8;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 3.4;
  };

  // Income
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Income', margin, y);
  y += 4;

  drawScheduleRow(
    data.sectionD.income.rentalIncome.name,
    data.sectionD.income.rentalIncome.code,
    data.sectionD.income.rentalIncome.grossAmount,
    data.sectionD.income.rentalIncome.ownerShare
  );

  drawScheduleRow(
    data.sectionD.income.grossRent.name,
    data.sectionD.income.grossRent.code,
    data.sectionD.income.grossRent.grossAmount,
    data.sectionD.income.grossRent.ownerShare,
    { isHighlighted: true, isBold: true }
  );

  // Expenses
  y += 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Expenses', margin, y);
  y += 4;

  data.sectionD.expenses.forEach((exp) => {
    drawScheduleRow(exp.name, exp.code, exp.grossAmount, exp.ownerShare);
  });

  // Check if we need to add a page break before totals if close to bottom
  if (y > A4_PAGE_HEIGHT - 35) {
    doc.addPage();
    y = 18;
  }

  // Total Expenses [W]
  drawScheduleRow(
    data.sectionD.totalExpenses.name,
    data.sectionD.totalExpenses.code,
    data.sectionD.totalExpenses.grossAmount,
    data.sectionD.totalExpenses.ownerShare,
    { isHighlighted: true, isBold: true }
  );

  // Total Net Rent [X]
  drawScheduleRow(
    data.sectionD.totalNetRent.name,
    data.sectionD.totalNetRent.code,
    data.sectionD.totalNetRent.grossAmount,
    data.sectionD.totalNetRent.ownerShare,
    { isHighlighted: true, isBold: true }
  );

  // Bottom Notice matching Image 1:
  // "THIS FORM CANNOT BE LODGED AS A PAPER REPRESENTATION OF THE FORM"
  y = A4_PAGE_HEIGHT - 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(data.taxYearLabel, margin, y);
  doc.text(
    'THIS FORM CANNOT BE LODGED AS A PAPER REPRESENTATION OF THE FORM',
    margin + contentWidth / 2,
    y,
    { align: 'center' }
  );

  stampReportFooters(doc, {
    systemLabel: 'PropertyLedge — ATO Rental Schedule (Item 21)',
    customFooterText: 'Official Australian Tax Return Rental Schedule Preparation',
  });

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}
