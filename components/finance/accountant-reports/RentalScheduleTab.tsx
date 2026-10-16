'use client';

import React from 'react';
import {
  RentalScheduleData,
  RentalScheduleItem,
} from '@/modules/finance/domain/accountant-reports-models';
import { formatAccountingAmount } from '@/modules/finance/domain/accountant-reports-format';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface RentalScheduleTabProps {
  data: RentalScheduleData;
  isLoading?: boolean;
}

export function RentalScheduleTab({
  data,
  isLoading,
}: RentalScheduleTabProps) {
  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="inline-block animate-spin w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Generating ATO Rental Property Schedule (Item 21)...
        </p>
      </div>
    );
  }

  const {
    property,
    taxYearLabel,
    financialYearLabel,
    sectionA,
    sectionB,
    sectionC,
    sectionD,
  } = data;

  return (
    <div className="space-y-6">
      {/* Official ATO Document Paper Container (Matching Reference Images 1 & 2) */}
      <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#0B1728] shadow-xs p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white">
        
        {/* Document Header */}
        <div className="border-b border-slate-300 dark:border-white/15 pb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
            <span>INDIVIDUAL TAX RETURN</span>
            <span className="font-sans normal-case text-slate-600 dark:text-slate-300">
              {sectionC.owners[0]?.name || 'Property Owner'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-slate-900 dark:text-white">
            Rental schedule — <span className="font-normal text-slate-700 dark:text-slate-300">{sectionA.address}, {sectionA.city} {sectionA.state} {sectionA.postcode}</span>
          </h2>

          {/* Address Table Grid */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Address</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{sectionA.address}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Town/City</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{sectionA.city}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">State</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{sectionA.state}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Postcode</span>
              <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{sectionA.postcode}</p>
            </div>
          </div>
        </div>

        {/* Section A: Property details */}
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Name of property</span>
            <span className="font-bold text-slate-900 dark:text-white">{sectionA.propertyName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Date property first earned rental income</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">{sectionA.dateFirstEarnedRentalIncome || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Number of weeks property was rented this year</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">{sectionA.weeksRentedThisYear}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">The number of weeks the property was available for rent this year</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">{sectionA.weeksAvailableForRentThisYear}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Entity's % ownership</span>
            <span className="font-bold font-mono text-slate-900 dark:text-white">{sectionA.ownershipPercentage}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Has the loan for the property been renegotiated this year?</span>
            <span className="font-bold text-slate-900 dark:text-white">{sectionA.loanRenegotiated}</span>
          </div>
        </div>

        {/* Section B: Acquisitions and Disposal */}
        <div className="space-y-1 text-xs pt-2">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/15 pb-1.5 font-bold">
            <span className="text-slate-900 dark:text-white text-[13px]">Acquisitions and Disposal</span>
            <div className="flex items-center gap-8 text-[11px] text-slate-500 uppercase">
              <span className="w-24 text-right">Date</span>
              <span className="w-28 text-right">Amount</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Acquisition</span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-24 text-right text-slate-700 dark:text-slate-300">{sectionB.acquisitionDate || '—'}</span>
              <span className="w-28 text-right font-bold text-slate-900 dark:text-white">
                {sectionB.acquisitionAmount ? formatAccountingAmount(sectionB.acquisitionAmount, true) : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Disposal</span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-24 text-right text-slate-700 dark:text-slate-300">{sectionB.disposalDate || '—'}</span>
              <span className="w-28 text-right font-bold text-slate-900 dark:text-white">
                {sectionB.disposalAmount ? formatAccountingAmount(sectionB.disposalAmount, true) : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Capital gain/loss on sale of this property</span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-24 text-right">—</span>
              <span className="w-28 text-right font-bold text-slate-900 dark:text-white">
                {formatAccountingAmount(sectionB.capitalGainLoss)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Value of capital allowances (depreciation on plant) recouped on the sale of the property
            </span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-24 text-right">—</span>
              <span className="w-28 text-right font-bold text-slate-900 dark:text-white">
                {formatAccountingAmount(sectionB.capitalAllowancesRecouped)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Value of capital works deductions (special building write-off) recouped on the sale of the property
            </span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-24 text-right">—</span>
              <span className="w-28 text-right font-bold text-slate-900 dark:text-white">
                {formatAccountingAmount(sectionB.capitalWorksRecouped)}
              </span>
            </div>
          </div>
        </div>

        {/* Section C: Owners */}
        <div className="space-y-1 text-xs pt-2">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-white/15 pb-1.5 font-bold">
            <span className="text-slate-900 dark:text-white text-[13px]">Owners</span>
            <div className="flex items-center gap-8 text-[11px] text-slate-500 uppercase">
              <span className="w-32 text-left">TFN</span>
              <span className="w-24 text-right">Percentage</span>
            </div>
          </div>

          {sectionC.owners.map((owner, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-800 dark:text-slate-200 font-medium">{owner.name}</span>
              <div className="flex items-center gap-8 font-mono">
                <span className="w-32 text-left text-slate-600 dark:text-slate-400 font-sans">{owner.tfnStatus}</span>
                <span className="w-24 text-right font-bold text-slate-900 dark:text-white">{owner.percentage}%</span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-end pt-1.5 font-bold font-mono text-slate-900 dark:text-white">
            <span className="w-24 text-right border-t border-slate-400 dark:border-white/30 pt-1">
              {sectionC.totalPercentage}%
            </span>
          </div>
        </div>

        {/* Section D: Income / Expenses (Matching Image 1 & Image 2) */}
        <div className="space-y-1 text-xs pt-4">
          <div className="flex items-center justify-between border-b border-black/70 dark:border-white/30 pb-2 font-bold">
            <span className="text-slate-950 dark:text-white text-sm">Income / Expenses</span>
            <div className="flex items-center gap-8 text-[11px] text-slate-600 dark:text-slate-400 uppercase font-semibold">
              <span className="w-28 text-right">Gross</span>
              <span className="w-28 text-right">share</span>
            </div>
          </div>

          {/* Income Subheading */}
          <div className="pt-2 pb-1 font-bold text-slate-900 dark:text-white">Income</div>

          {/* Rental Income */}
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {sectionD.income.rentalIncome.name}
            </span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-28 text-right text-slate-900 dark:text-white">
                {formatAccountingAmount(sectionD.income.rentalIncome.grossAmount)}
              </span>
              <span className="w-28 text-right text-slate-900 dark:text-white">
                {formatAccountingAmount(sectionD.income.rentalIncome.ownerShare)}
              </span>
            </div>
          </div>

          {/* Gross Rent - Light Blue Highlight Row from Screenshot */}
          <div className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg bg-[#E8F1FC] dark:bg-[#152B44] font-bold text-slate-950 dark:text-white">
            <span>{sectionD.income.grossRent.name}</span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-28 text-right">
                {formatAccountingAmount(sectionD.income.grossRent.grossAmount)}
              </span>
              <span className="w-28 text-right">
                {formatAccountingAmount(sectionD.income.grossRent.ownerShare)}
              </span>
            </div>
          </div>

          {/* Expenses Subheading */}
          <div className="pt-4 pb-1 font-bold text-slate-900 dark:text-white">Expenses</div>

          {/* Itemized Expenses without Code Badges */}
          {sectionD.expenses.map((exp) => (
            <div
              key={exp.code}
              className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
            >
              <span className="text-slate-700 dark:text-slate-300 font-medium">{exp.name}</span>
              <div className="flex items-center gap-8 font-mono">
                <span className="w-28 text-right text-slate-900 dark:text-white">
                  {formatAccountingAmount(exp.grossAmount)}
                </span>
                <span className="w-28 text-right text-slate-900 dark:text-white">
                  {formatAccountingAmount(exp.ownerShare)}
                </span>
              </div>
            </div>
          ))}

          {/* Total Expenses - Highlight Row (Matching Image 2) */}
          <div className="flex items-center justify-between py-2.5 px-3 -mx-3 mt-3 rounded-lg bg-[#E8F1FC] dark:bg-[#152B44] font-bold text-slate-950 dark:text-white">
            <span>{sectionD.totalExpenses.name}</span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-28 text-right">
                {formatAccountingAmount(sectionD.totalExpenses.grossAmount)}
              </span>
              <span className="w-28 text-right">
                {formatAccountingAmount(sectionD.totalExpenses.ownerShare)}
              </span>
            </div>
          </div>

          {/* Total Net Rent - Highlight Row (Matching Image 2) */}
          <div className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg bg-[#E8F1FC] dark:bg-[#152B44] font-bold text-slate-950 dark:text-white">
            <span>{sectionD.totalNetRent.name}</span>
            <div className="flex items-center gap-8 font-mono">
              <span className="w-28 text-right">
                {formatAccountingAmount(sectionD.totalNetRent.grossAmount)}
              </span>
              <span className="w-28 text-right">
                {formatAccountingAmount(sectionD.totalNetRent.ownerShare)}
              </span>
            </div>
          </div>
        </div>

        {/* Form Footer Notice (Matching Image 1 bottom) */}
        <div className="pt-6 border-t border-slate-300 dark:border-white/15 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 font-mono">
          <span>{taxYearLabel}</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            THIS FORM CANNOT BE LODGED AS A PAPER REPRESENTATION OF THE FORM
          </span>
          <span>Schedule Item 21</span>
        </div>
      </div>
    </div>
  );
}
