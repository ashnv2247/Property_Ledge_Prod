'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  FileX2,
  Eye,
  X,
} from 'lucide-react';
import { ColDef } from 'ag-grid-community';
import { AdminDataGrid } from '@/components/admin/data-grid';
import { Badge } from '@/components/admin/ui/Badge';
import { formatCurrency } from '@/lib/format/currency';
import { AccountantExpenseItem } from '@/modules/finance/domain/accountant-report-types';
import { cn } from '@/lib/utils';

export type QueueTabType = 'all' | 'missing-evidence' | 'needs-review' | 'disputed' | 'verified' | 'unreconciled';

export interface ExpenseTransactionsGridProps {
  expenses: AccountantExpenseItem[];
  selectedCategoryName?: string | null;
  onClearCategoryFilter?: () => void;
  onSelectExpense: (expense: AccountantExpenseItem) => void;
}

export function ExpenseTransactionsGrid({
  expenses = [],
  selectedCategoryName,
  onClearCategoryFilter,
  onSelectExpense,
}: ExpenseTransactionsGridProps) {
  // Queue Tab State
  const [activeQueueTab, setActiveQueueTab] = useState<QueueTabType>('all');

  // Queue Counts derived from current scope
  const queueCounts = useMemo(() => {
    let all = 0;
    let missingEvidence = 0;
    let needsReview = 0;
    let disputed = 0;
    let verified = 0;
    let unreconciled = 0;

    for (const exp of expenses) {
      all++;
      if (!exp.hasEvidence) missingEvidence++;
      if (exp.reviewStatus === 'needs_review') needsReview++;
      if (exp.reviewStatus === 'disputed') disputed++;
      if (exp.reviewStatus === 'verified') verified++;
      if (!exp.isReconciled) unreconciled++;
    }

    return { all, missingEvidence, needsReview, disputed, verified, unreconciled };
  }, [expenses]);

  // Filtered items based on active queue tab and selected category filter
  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    // 1. Category Filter from parent
    if (selectedCategoryName) {
      result = result.filter((e) => e.categoryName === selectedCategoryName);
    }

    // 2. Queue Tab Filter
    switch (activeQueueTab) {
      case 'missing-evidence':
        result = result.filter((e) => !e.hasEvidence);
        break;
      case 'needs-review':
        result = result.filter((e) => e.reviewStatus === 'needs_review');
        break;
      case 'disputed':
        result = result.filter((e) => e.reviewStatus === 'disputed');
        break;
      case 'verified':
        result = result.filter((e) => e.reviewStatus === 'verified');
        break;
      case 'unreconciled':
        result = result.filter((e) => !e.isReconciled);
        break;
      default:
        break;
    }

    return result;
  }, [expenses, selectedCategoryName, activeQueueTab]);

  // AG-Grid Column Definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      {
        headerName: 'REF',
        field: 'displayId',
        width: 110,
        pinned: 'left',
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <span className="font-mono font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#008F83] text-xs">
              {row.displayId}
            </span>
          );
        },
      },
      {
        headerName: 'DATE',
        field: 'transactionDate',
        width: 115,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
              {row.formattedDate || row.transactionDate}
            </span>
          );
        },
      },
      {
        headerName: 'SUPPLIER / VENDOR',
        field: 'vendorName',
        flex: 2,
        minWidth: 200,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <div className="py-1 min-w-0 leading-tight">
              <span className="font-bold text-slate-900 dark:text-white block truncate text-xs">
                {row.vendorName}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {row.description}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'CATEGORY',
        field: 'categoryName',
        width: 150,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 truncate inline-block max-w-[140px]">
              {row.categoryName}
            </span>
          );
        },
      },
      {
        headerName: 'PROPERTY',
        field: 'propertyName',
        width: 150,
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
              {row.propertyName}
            </span>
          );
        },
      },
      {
        headerName: 'GROSS (AUD)',
        field: 'amount',
        width: 125,
        type: 'rightAligned',
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
              {row.formattedAmount || formatCurrency(row.amount)}
            </span>
          );
        },
      },
      {
        headerName: 'GST',
        field: 'gstAmount',
        width: 105,
        type: 'rightAligned',
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
              {row.formattedGst || formatCurrency(row.gstAmount)}
            </span>
          );
        },
      },
      {
        headerName: 'EVIDENCE',
        field: 'hasEvidence',
        width: 115,
        cellClass: 'text-center',
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return row.hasEvidence ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <Receipt className="w-3 h-3" />
              <span>Attached</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
              <FileX2 className="w-3 h-3" />
              <span>Missing</span>
            </span>
          );
        },
      },
      {
        headerName: 'RECONCILED',
        field: 'isReconciled',
        width: 115,
        cellClass: 'text-center',
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return row.isReconciled ? (
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              MATCHED
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold text-slate-400">
              PENDING
            </span>
          );
        },
      },
      {
        headerName: 'REVIEW',
        field: 'reviewStatus',
        width: 110,
        cellClass: 'text-center',
        sortable: true,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          if (row.reviewStatus === 'verified') {
            return (
              <Badge variant="success" className="text-[10px] font-bold gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Verified
              </Badge>
            );
          }
          if (row.reviewStatus === 'needs_review') {
            return (
              <Badge variant="warning" className="text-[10px] font-bold gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                Review
              </Badge>
            );
          }
          if (row.reviewStatus === 'disputed') {
            return (
              <Badge variant="danger" className="text-[10px] font-bold gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                Dispute
              </Badge>
            );
          }
          return <span className="text-[10px] font-medium text-slate-400">—</span>;
        },
      },
      {
        headerName: 'ACTION',
        field: 'id',
        width: 100,
        pinned: 'right',
        cellClass: 'text-center',
        sortable: false,
        cellRenderer: (params: any) => {
          const row = params.data as AccountantExpenseItem;
          if (!row) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectExpense(row);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#008F83] hover:underline cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>
          );
        },
      },
    ];
  }, [onSelectExpense]);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#08182A] shadow-sm overflow-hidden space-y-0">
      {/* 1. Queue Tabs Toolbar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {/* Tab: All */}
          <button
            type="button"
            onClick={() => setActiveQueueTab('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeQueueTab === 'all'
                ? "bg-[#008F83] text-white shadow-sm"
                : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/[0.06]"
            )}
          >
            <span>All Expenses</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
              activeQueueTab === 'all' ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-white/[0.1] text-slate-600 dark:text-slate-300"
            )}>
              {queueCounts.all}
            </span>
          </button>

          {/* Tab: Missing Evidence */}
          <button
            type="button"
            onClick={() => setActiveQueueTab('missing-evidence')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeQueueTab === 'missing-evidence'
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white dark:bg-white/[0.04] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Missing Evidence</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              activeQueueTab === 'missing-evidence' ? "bg-white/20 text-white" : "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
            )}>
              {queueCounts.missingEvidence}
            </span>
          </button>

          {/* Tab: Needs Review */}
          <button
            type="button"
            onClick={() => setActiveQueueTab('needs-review')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeQueueTab === 'needs-review'
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white dark:bg-white/[0.04] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Needs Review</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              activeQueueTab === 'needs-review' ? "bg-white/20 text-white" : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
            )}>
              {queueCounts.needsReview}
            </span>
          </button>

          {/* Tab: Disputed */}
          <button
            type="button"
            onClick={() => setActiveQueueTab('disputed')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeQueueTab === 'disputed'
                ? "bg-rose-700 text-white shadow-sm"
                : "bg-white dark:bg-white/[0.04] text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200/60 dark:border-white/[0.06]"
            )}
          >
            <span>Disputed</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              activeQueueTab === 'disputed' ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-white/[0.1] text-slate-600 dark:text-slate-300"
            )}>
              {queueCounts.disputed}
            </span>
          </button>

          {/* Tab: Verified */}
          <button
            type="button"
            onClick={() => setActiveQueueTab('verified')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeQueueTab === 'verified'
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white dark:bg-white/[0.04] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/60 dark:border-white/[0.06]"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              activeQueueTab === 'verified' ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
            )}>
              {queueCounts.verified}
            </span>
          </button>

          {/* Tab: Unreconciled */}
          <button
            type="button"
            onClick={() => setActiveQueueTab('unreconciled')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
              activeQueueTab === 'unreconciled'
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/60 dark:border-white/[0.06]"
            )}
          >
            <span>Unreconciled</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              activeQueueTab === 'unreconciled' ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-white/[0.1] text-slate-600 dark:text-slate-300"
            )}>
              {queueCounts.unreconciled}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Chip Bar (if category selected) */}
      {selectedCategoryName && (
        <div className="px-4 py-2 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtered by category:</span>
            <Badge variant="primary" className="gap-1 text-xs">
              <span>{selectedCategoryName}</span>
              <button
                type="button"
                onClick={onClearCategoryFilter}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer ml-1"
                aria-label="Clear category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {filteredExpenses.length} transaction(s)
          </span>
        </div>
      )}

      {/* 3. AG-Grid Implementation */}
      <div className="p-3 sm:p-4 min-h-[560px]">
        <AdminDataGrid<AccountantExpenseItem>
          gridId="accountant-expenses-grid"
          rowData={filteredExpenses}
          columnDefs={columnDefs}
          searchPlaceholder="Search by supplier, description, ref, or amount..."
          defaultPageSize={25}
          enableSelection={false}
          enableColumnChooser={true}
          enableExport={true}
          exportFilename={`expense-audit-pack-${expenses.length}-items`}
          onRowClick={(row) => onSelectExpense(row)}
          getRowId={(p) => p.data.id}
          labelSingular="expense"
          labelPlural="expenses"
          rowHeight={52}
          emptyTitle="No expenses found"
          emptyDescription="No expense records match the selected queue tab or category filter."
        />
      </div>
    </div>
  );
}
