'use client';

import React, { useState } from 'react';
import { FileText, CheckCircle2, Circle, Image as ImageIcon } from 'lucide-react';
import { PropertyExpenseItem } from '@/modules/properties/domain/accountant-report-types';
import { ReceiptPreviewModal } from './ReceiptPreviewModal';
import { togglePropertyExpenseVerificationAction } from '@/app/actions/property-accountant-report';

interface ExpenseRowProps {
  expense: PropertyExpenseItem;
  onVerificationChange?: (expenseId: string, verified: boolean) => void;
}

export function ExpenseRow({ expense, onVerificationChange }: ExpenseRowProps) {
  const [isVerified, setIsVerified] = useState(expense.isVerified);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    const nextState = !isVerified;
    setIsVerified(nextState);
    onVerificationChange?.(expense.id, nextState);
    setIsUpdating(true);
    try {
      await togglePropertyExpenseVerificationAction(expense.id, nextState);
    } catch (err) {
      console.error('Failed to update verification status:', err);
      // Revert if error
      setIsVerified(!nextState);
      onVerificationChange?.(expense.id, !nextState);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <tr className="border-b border-slate-700/60 hover:bg-slate-800/40 transition-colors">
        {/* Column 1: Expense Name + Date + Amount */}
        <td className="py-3.5 px-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-100">{expense.name}</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400 font-mono">{expense.formattedDate}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400">{expense.categoryName}</span>
            </div>
          </div>
        </td>

        {/* Amount */}
        <td className="py-3.5 px-4 text-right">
          <span className="font-mono text-sm font-bold text-slate-100">
            {expense.formattedAmount}
          </span>
        </td>

        {/* Column 2: Thumbnail of Invoice/Receipt image */}
        <td className="py-3.5 px-4 text-center">
          {expense.receiptUrl ? (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 hover:border-teal-500 hover:bg-slate-700/80 transition-all overflow-hidden group shadow-xs"
              title="Click to view full invoice/receipt"
            >
              {expense.receiptUrl.toLowerCase().includes('.pdf') ? (
                <FileText className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
              ) : (
                <img
                  src={expense.receiptUrl}
                  alt={expense.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              )}
            </button>
          ) : (
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-600"
              title="No receipt attached"
            >
              <ImageIcon className="w-4 h-4 opacity-40" />
            </span>
          )}
        </td>

        {/* Column 3: Checkbox Verified + Unverified toggle */}
        <td className="py-3.5 px-4 text-right">
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleToggle}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isVerified
                ? 'bg-teal-500/10 border-teal-500/40 text-teal-400 hover:bg-teal-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {isVerified ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Verified</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 text-slate-500" />
                <span>Unverified</span>
              </>
            )}
          </button>
        </td>
      </tr>

      <ReceiptPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        receiptUrl={expense.receiptUrl}
        expenseName={expense.name}
        amount={expense.formattedAmount}
      />
    </>
  );
}
