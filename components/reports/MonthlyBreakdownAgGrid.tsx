'use client';

import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  ValidationModule,
  RowClickedEvent,
} from 'ag-grid-community';
import type { CustomCellRendererProps } from 'ag-grid-react';
import { MonthlyFinancialSummary } from '@/modules/finance/domain/reporting-types';
import {
  CategoryQuarterlyRow,
  MonthlyBreakdownRow,
  buildMonthlyBreakdownData,
  formatReportCurrency,
} from '@/lib/finance/category-report-data';
import { MonthDetailRenderer } from '@/components/reports/MonthDetailRenderer';
import { cn } from '@/lib/utils';
import { Calendar, ChevronDown, ChevronRight, Info } from 'lucide-react';

// Register AG Grid Community modules ONLY (Free Community edition)
ModuleRegistry.registerModules([
  AllCommunityModule,
  ValidationModule,
]);

const AgGridReact = dynamic(
  () => import('ag-grid-react').then((mod) => mod.AgGridReact),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full flex items-center justify-center animate-pulse bg-white dark:bg-[#08182A] rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-xs text-slate-400 font-medium">Loading Monthly Grid...</span>
      </div>
    ),
  }
) as unknown as typeof import('ag-grid-react').AgGridReact;

export interface MonthlyGridRowItem {
  id: string;
  key: string;
  label: string;
  shortLabel: string;
  income: number;
  expenses: number;
  net: number;
  gstCollected: number;
  gstPaid: number;
  transactionCount: number;
  isDetailRow?: boolean;
  isExpanded?: boolean;
  monthRow?: MonthlyBreakdownRow;
}

interface MonthlyBreakdownAgGridProps {
  monthlyTrends: MonthlyFinancialSummary[];
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  totalGstCollected: number;
  totalGstPaid: number;
  className?: string;
  propertyId?: string;
  financialYear?: string | number;
  rawTransactions?: any[];
  categoryRows?: CategoryQuarterlyRow[];
}

export function MonthlyBreakdownAgGrid({
  monthlyTrends = [],
  totalIncome,
  totalExpenses,
  netResult,
  totalGstCollected,
  totalGstPaid,
  className,
  propertyId,
  financialYear,
  rawTransactions = [],
  categoryRows = [],
}: MonthlyBreakdownAgGridProps) {
  const gridRef = useRef<any>(null);

  // Build full monthly data with transactions attached for master-detail expansion
  const monthlyRows = useMemo<MonthlyBreakdownRow[]>(() => {
    return buildMonthlyBreakdownData(monthlyTrends, rawTransactions, categoryRows);
  }, [monthlyTrends, rawTransactions, categoryRows]);

  // Expand first month with transactions by default (e.g. Oct 2025 in demo)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const defaultSet = new Set<string>();
    const monthWithTx = monthlyRows.find((m) => m.transactions && m.transactions.length > 0);
    if (monthWithTx) {
      defaultSet.add(monthWithTx.key);
    }
    return defaultSet;
  });

  const toggleMonth = useCallback((key: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Compute totals
  const totals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let gstCol = 0;
    let gstPd = 0;
    monthlyRows.forEach((m) => {
      inc += m.income;
      exp += m.expenses;
      gstCol += m.gstCollected;
      gstPd += m.gstPaid;
    });
    return {
      income: totalIncome > 0 ? totalIncome : inc,
      expenses: totalExpenses > 0 ? totalExpenses : exp,
      net: netResult !== 0 ? netResult : (totalIncome > 0 ? totalIncome : inc) - (totalExpenses > 0 ? totalExpenses : exp),
      gstCollected: totalGstCollected > 0 ? totalGstCollected : gstCol,
      gstPaid: totalGstPaid > 0 ? totalGstPaid : gstPd,
    };
  }, [monthlyRows, totalIncome, totalExpenses, netResult, totalGstCollected, totalGstPaid]);

  // Flatten rows + detail rows
  const displayRowData = useMemo<MonthlyGridRowItem[]>(() => {
    const result: MonthlyGridRowItem[] = [];
    monthlyRows.forEach((m) => {
      const isExpanded = expandedIds.has(m.key);
      result.push({
        id: m.key,
        key: m.key,
        label: m.label,
        shortLabel: m.shortLabel,
        income: m.income,
        expenses: m.expenses,
        net: m.net,
        gstCollected: m.gstCollected,
        gstPaid: m.gstPaid,
        transactionCount: m.transactionCount,
        isDetailRow: false,
        isExpanded,
        monthRow: m,
      });

      if (isExpanded) {
        result.push({
          id: `${m.key}_detail`,
          key: `${m.key}_detail`,
          label: m.label,
          shortLabel: m.shortLabel,
          income: m.income,
          expenses: m.expenses,
          net: m.net,
          gstCollected: m.gstCollected,
          gstPaid: m.gstPaid,
          transactionCount: m.transactionCount,
          isDetailRow: true,
          monthRow: m,
        });
      }
    });
    return result;
  }, [monthlyRows, expandedIds]);

  // Reset row heights on expand / collapse
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.resetRowHeights();
    }
  }, [displayRowData]);

  // Pinned bottom summary row matching totals
  const pinnedBottomRowData = useMemo<MonthlyGridRowItem[]>(() => {
    return [
      {
        id: 'pinned_annual_total',
        key: 'pinned_annual_total',
        label: 'Annual Total',
        shortLabel: 'Total',
        income: totals.income,
        expenses: totals.expenses,
        net: totals.net,
        gstCollected: totals.gstCollected,
        gstPaid: totals.gstPaid,
        transactionCount: 0,
        isDetailRow: false,
      },
    ];
  }, [totals]);

  // Full-width detail cell renderer
  const FullWidthDetailRenderer = useCallback(
    (props: any) => {
      const monthRow = props.data?.monthRow as MonthlyBreakdownRow;
      if (!monthRow) return null;
      return (
        <div className="w-full h-full bg-[#F8FAFB] dark:bg-[#061524]">
          <MonthDetailRenderer
            data={monthRow}
            propertyId={propertyId}
            financialYear={financialYear}
          />
        </div>
      );
    },
    [propertyId, financialYear]
  );

  // Month cell renderer with Chevron indicator & Calendar icon
  const MonthCell = useCallback((props: CustomCellRendererProps<MonthlyGridRowItem>) => {
    const { data, node } = props;
    if (!data || data.isDetailRow) return null;
    const isPinned = node.isRowPinned();
    const isExpanded = Boolean(data.isExpanded);

    if (isPinned) {
      return (
        <div className="flex items-center gap-2 pl-4 py-1 font-bold text-slate-900 dark:text-white text-sm sm:text-base">
          <span>{data.label}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 py-1 pl-1 select-none pointer-events-none">
        {/* Expand / Collapse Chevron Indicator */}
        <div className="w-5 flex items-center justify-center">
          <span className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-transform">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#238358] dark:text-[#32D5C4]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </span>
        </div>

        {/* Calendar Icon Badge */}
        <div
          className={cn(
            'p-1.5 rounded-lg shrink-0 transition-colors',
            isExpanded
              ? 'bg-[#238358] text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          )}
        >
          <Calendar className="w-4 h-4" />
        </div>

        {/* Month Label */}
        <div className="min-w-0">
          <span
            className={cn(
              'text-xs sm:text-sm font-medium block truncate',
              isExpanded
                ? 'font-bold text-slate-900 dark:text-white'
                : 'text-slate-800 dark:text-slate-200'
            )}
          >
            {data.label}
          </span>
        </div>
      </div>
    );
  }, []);

  const colDefs = useMemo<ColDef<MonthlyGridRowItem>[]>(() => {
    return [
      {
        colId: 'month',
        headerName: 'Month',
        field: 'label',
        cellRenderer: MonthCell,
        minWidth: 180,
        flex: 1.5,
        sortable: false,
        headerClass: 'text-left font-semibold text-slate-700 dark:text-slate-300 text-xs border-r border-slate-200/80 dark:border-slate-800',
        cellClass: 'border-r border-slate-100 dark:border-slate-800/80',
      },
      {
        colId: 'income',
        field: 'income',
        headerComponent: () => (
          <div className="w-full text-center font-semibold text-slate-700 dark:text-slate-300 text-xs">
            Income ($)
          </div>
        ),
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 130,
        flex: 1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-semibold text-[#238358] dark:text-[#32D5C4] border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned() && 'font-bold text-sm sm:text-base'
          ),
      },
      {
        colId: 'expenses',
        field: 'expenses',
        headerComponent: () => (
          <div className="w-full text-center font-semibold text-slate-700 dark:text-slate-300 text-xs">
            Expenses ($)
          </div>
        ),
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 130,
        flex: 1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-semibold border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned()
              ? 'font-bold text-slate-900 dark:text-white text-sm sm:text-base'
              : params.value > 0
              ? 'text-slate-900 dark:text-white font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          ),
      },
      {
        colId: 'net',
        field: 'net',
        headerComponent: () => (
          <div className="w-full text-center font-bold text-slate-900 dark:text-white text-xs">
            Net Profit ($)
          </div>
        ),
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 130,
        flex: 1.1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-bold border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned()
              ? 'text-sm sm:text-base text-slate-900 dark:text-white'
              : params.value >= 0
              ? 'text-[#238358] dark:text-[#32D5C4]'
              : 'text-rose-600 dark:text-rose-400'
          ),
      },
      {
        colId: 'gstCollected',
        field: 'gstCollected',
        headerComponent: () => (
          <div className="w-full text-center font-medium text-slate-600 dark:text-slate-400 text-xs">
            GST Collected
          </div>
        ),
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 120,
        flex: 1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned() && 'font-bold text-slate-900 dark:text-white text-sm sm:text-base'
          ),
      },
      {
        colId: 'gstPaid',
        field: 'gstPaid',
        headerComponent: () => (
          <div className="w-full text-center font-medium text-slate-600 dark:text-slate-400 text-xs">
            GST Paid
          </div>
        ),
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 120,
        flex: 1,
        sortable: false,
        headerClass: 'text-center font-medium text-slate-600 dark:text-slate-400 text-xs',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400',
            params.node.isRowPinned() && 'font-bold text-slate-900 dark:text-white text-sm sm:text-base'
          ),
      },
    ];
  }, [MonthCell]);

  // Click on any month row to expand or collapse
  const onRowClicked = useCallback(
    (e: RowClickedEvent<MonthlyGridRowItem>) => {
      if (e.node.isRowPinned() || e.data?.isDetailRow) return;
      if (e.data?.key) {
        toggleMonth(e.data.key);
      }
    },
    [toggleMonth]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="bg-white dark:bg-[#08182A] border border-border rounded-2xl shadow-2xs overflow-hidden">
        <div
          className="ag-theme-quartz dark:ag-theme-quartz-dark w-full"
          style={{
            width: '100%',
            '--ag-header-height': '52px',
            '--ag-row-height': '46px',
            '--ag-border-color': '#E2E8F0',
            '--ag-row-border-color': '#F1F5F9',
            '--ag-cell-horizontal-border': 'solid 1px #F1F5F9',
            '--ag-header-background-color': '#FAFBFB',
            '--ag-row-hover-color': '#F8FAFB',
            '--ag-font-family': 'inherit',
            '--ag-header-column-separator-display': 'block',
            '--ag-header-column-separator-color': '#CBD5E1',
            '--ag-header-column-separator-height': '55%',
          } as React.CSSProperties}
        >
          <AgGridReact
            ref={gridRef}
            domLayout="autoHeight"
            rowData={displayRowData}
            getRowId={(params) => params.data.id}
            columnDefs={colDefs}
            pinnedBottomRowData={pinnedBottomRowData}
            isFullWidthRow={(params) => Boolean(params.rowNode.data?.isDetailRow)}
            fullWidthCellRenderer={FullWidthDetailRenderer}
            getRowHeight={(params) => {
              if (params.node.data?.isDetailRow) {
                const txCount = params.node.data?.monthRow?.transactions?.length || 0;
                return txCount === 0 ? 120 : 160 + txCount * 38;
              }
              return 46;
            }}
            onRowClicked={onRowClicked}
            getRowClass={(params) => {
              if (params.node.isRowPinned()) {
                return 'bg-slate-50/95 dark:bg-[#071526] border-t-2 border-slate-300 dark:border-slate-600 font-bold shadow-xs';
              }
              if (params.data?.isDetailRow) {
                return 'bg-[#F8FAFB] dark:bg-[#061524] border-b border-slate-200/80 dark:border-slate-800';
              }
              if (params.data?.isExpanded) {
                return 'bg-[#EAF7EE]/50 dark:bg-[#008F83]/10 border-l-4 border-l-[#238358] cursor-pointer';
              }
              return 'cursor-pointer hover:bg-slate-50/70 transition-colors';
            }}
            suppressCellFocus={true}
            animateRows={false}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Click a month row to expand and view its transactions.</span>
      </div>
    </div>
  );
}
