'use client';

import React, { useState } from 'react';
import { Download, FileCheck, UploadCloud, Info } from 'lucide-react';
import { PropertyAccountantReportPayload } from '@/modules/properties/domain/accountant-report-types';
import { formatCurrency } from '@/lib/format/currency';
import { ExpenseRow } from './ExpenseRow';

interface ATOFormTabProps {
  data: PropertyAccountantReportPayload;
}

export function ATOFormTab({ data }: ATOFormTabProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { atoForm, property, financialYearLabel } = data;

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/properties/${property.id}/export-pdf?fy=${data.financialYear}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ATO-Rental-Schedule-${property.name.replace(/\s+/g, '-')}-${financialYearLabel}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Export PDF Action */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20">
              ATO Replica Schedule
            </span>
            <span className="text-xs text-slate-400 font-mono">{financialYearLabel}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mt-2">
            Rental Property Tax Return Verification
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal black & white schedule for tax agents, accountants, and ATO reconciliation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors shadow-lg shadow-teal-500/20 disabled:opacity-50 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Generating PDF...' : 'Export ATO PDF'}</span>
        </button>
      </div>

      {/* Main ATO Form (Clean Black & White Sheet Replica) */}
      <div className="bg-white text-slate-900 rounded-2xl border-2 border-slate-900 shadow-2xl p-6 sm:p-10 font-sans max-w-4xl mx-auto">
        {/* Form Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h1 className="text-xl font-black uppercase tracking-tight">
              Rental Property Schedule
            </h1>
            <span className="text-sm font-bold font-mono">
              {financialYearLabel}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Australian Taxation Office — Individual Tax Return Supplement
          </p>
        </div>

        {/* Property Metadata Header */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 mb-8 text-xs grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="font-bold text-slate-700 block">Property Full Address:</span>
            <span className="text-slate-900 font-medium">{atoForm.propertyAddress}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-slate-700 block">Ownership Share:</span>
              <span className="text-slate-900 font-mono font-bold">{atoForm.ownershipPercentage}%</span>
            </div>
            <div>
              <span className="font-bold text-slate-700 block">First Year Rented:</span>
              <span className="text-slate-500 font-mono">—</span>
            </div>
          </div>
        </div>

        {/* Section 1: Rental Income */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider mb-2">
            1. Rental Income
          </div>

          <div className="divide-y divide-slate-200 text-sm">
            <div className="grid grid-cols-12 py-2.5 items-center">
              <span className="col-span-8 font-medium text-slate-800">
                Gross rent received
              </span>
              <span className="col-span-4 text-right font-mono font-semibold text-slate-900">
                {formatCurrency(atoForm.rentalIncome.grossRent)}
              </span>
            </div>

            <div className="grid grid-cols-12 py-2.5 items-center">
              <span className="col-span-8 font-medium text-slate-800">
                Other rental-related income
              </span>
              <span className="col-span-4 text-right font-mono text-slate-400">
                —
              </span>
            </div>

            <div className="grid grid-cols-12 py-3 items-center bg-slate-100/80 px-2 font-bold border-t-2 border-slate-900">
              <span className="col-span-8 uppercase text-xs tracking-wider">
                Total Gross Rental Income
              </span>
              <span className="col-span-4 text-right font-mono text-base">
                {formatCurrency(atoForm.rentalIncome.totalGrossRentalIncome)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Deductions */}
        <div className="mb-8">
          <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-xs uppercase tracking-wider mb-2">
            2. Rental Expenses & Deductions
          </div>

          <div className="divide-y divide-slate-200 text-sm">
            {atoForm.deductions.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 py-2 items-center hover:bg-slate-50 transition-colors">
                <span className="col-span-8 font-medium text-slate-800">
                  {item.name}
                </span>
                <span className="col-span-4 text-right font-mono font-semibold text-slate-900">
                  {item.amount !== null && item.amount > 0 ? (
                    formatCurrency(item.amount)
                  ) : (
                    <span className="text-slate-400 font-normal">—</span>
                  )}
                </span>
              </div>
            ))}

            <div className="grid grid-cols-12 py-3 items-center bg-slate-100/80 px-2 font-bold border-t-2 border-slate-900">
              <span className="col-span-8 uppercase text-xs tracking-wider">
                Total Deductions / Expenses
              </span>
              <span className="col-span-4 text-right font-mono text-base text-rose-700">
                {formatCurrency(atoForm.totalDeductions)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Net Rental Income (Loss) */}
        <div className="border-2 border-slate-900 p-4 bg-slate-50 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider font-black text-slate-600 block">
                3. Net Position
              </span>
              <span className="text-base font-bold text-slate-900">
                Net Rental Income (or Loss)
              </span>
            </div>
            <span
              className={`font-mono text-2xl font-black ${
                atoForm.netRentalIncome >= 0 ? 'text-slate-900' : 'text-rose-700'
              }`}
            >
              {formatCurrency(atoForm.netRentalIncome)}
            </span>
          </div>
        </div>

        {/* Future Calculation Placeholders */}
        <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-700">Loan Interest & Income Proof Placeholders:</p>
          <p>• Loan interest deduction calculation: <span className="font-mono text-slate-500">— (Configurable in Mortgage Hub)</span></p>
          <p>• Agent Statement / Bank Statement Upload: <span className="font-mono text-slate-500">— (Not required for baseline verification)</span></p>
        </div>
      </div>

      {/* Expense Table: Below Form */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Itemized Expense Records & Proof Verification
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review individual expense items, inspect invoice receipt attachments, and toggle verification for audit readiness.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700">
              {atoForm.expenses.length} Records
            </span>
          </div>
        </div>

        {atoForm.expenses.length === 0 ? (
          <div className="py-12 px-6 text-center bg-slate-900/60 rounded-xl border border-slate-700/60">
            <FileCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-200">No expenses for this FY</h4>
            <p className="text-xs text-slate-400 mt-1">
              There are no recorded operating expenses for this property during {financialYearLabel}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Expense Details & Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Receipt Thumbnail</th>
                  <th className="py-3 px-4 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody>
                {atoForm.expenses.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
