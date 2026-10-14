'use client';

import React from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  expenseName: string;
  amount: string;
}

export function ReceiptPreviewModal({
  isOpen,
  onClose,
  receiptUrl,
  expenseName,
  amount,
}: ReceiptPreviewModalProps) {
  if (!isOpen) return null;

  const isPdf = receiptUrl?.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900/60">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{expenseName}</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{amount}</p>
          </div>
          <div className="flex items-center gap-2">
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-700 rounded-lg transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-950/40 min-h-[350px]">
          {receiptUrl ? (
            isPdf ? (
              <iframe
                src={receiptUrl}
                title="Receipt PDF"
                className="w-full h-[600px] rounded-lg border border-slate-700"
              />
            ) : (
              <img
                src={receiptUrl}
                alt={expenseName}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg border border-slate-700"
              />
            )
          ) : (
            <div className="text-center p-8 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">No receipt attachment uploaded for this expense.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
