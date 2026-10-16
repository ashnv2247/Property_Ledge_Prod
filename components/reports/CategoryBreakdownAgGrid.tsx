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
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import {
  CategoryQuarterlyRow,
  formatReportCurrency,
} from '@/lib/finance/category-report-data';
import { CategoryIcon } from '@/components/reports/CategoryIcon';
import { CategoryDetailRenderer } from '@/components/reports/CategoryDetailRenderer';
import { QuarterHeaderComponent } from '@/components/reports/QuarterHeaderComponent';
import { cn } from '@/lib/utils';

// Register AG Grid Community modules ONLY (100% Free, zero enterprise license warning/error)
ModuleRegistry.registerModules([
  AllCommunityModule,
  ValidationModule,
]);

// Dynamically import AgGridReact to prevent SSR mismatch
const AgGridReact = dynamic(
  () => import('ag-grid-react').then((mod) => mod.AgGridReact),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full flex items-center justify-center animate-pulse bg-white dark:bg-[#08182A] rounded-2xl border border-slate-200 dark:border-slate-800">
        <span className="text-xs text-slate-400 font-medium">Loading Financial Grid...</span>
      </div>
    ),
  }
) as unknown as typeof import('ag-grid-react').AgGridReact;

export interface GridRowItem {
  id: string;
  isDetailRow?: boolean;
  isExpanded?: boolean;
  categoryRow?: CategoryQuarterlyRow;
  categoryName?: string;
  iconName?: string;
  isFixed?: boolean;
  order?: number;
  q1Amount?: number;
  q2Amount?: number;
  q3Amount?: number;
  q4Amount?: number;
  totalAmount?: number;
  transactionCount?: number;
  transactions?: any[];
}

interface CategoryBreakdownAgGridProps {
  rows: CategoryQuarterlyRow[];
  totalExpenses: number;
  propertyId?: string;
  financialYear?: string | number;
  className?: string;
}

export function CategoryBreakdownAgGrid({
  rows,
  totalExpenses,
  propertyId,
  financialYear,
  className,
}: CategoryBreakdownAgGridProps) {
  const gridRef = useRef<any>(null);

  // Default expanded category matching Image 1 (Repairs & maintenance has 6 transactions)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const defaultSet = new Set<string>();
    const repairRow = rows.find((r) => r.categoryName?.toLowerCase().includes('repair'));
    if (repairRow) {
      defaultSet.add(repairRow.id);
    } else {
      const firstWithTx = rows.find((r) => r.transactions && r.transactions.length > 0);
      if (firstWithTx) defaultSet.add(firstWithTx.id);
    }
    return defaultSet;
  });

  const toggleCategory = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Compute column totals for pinned bottom row
  const totals = useMemo(() => {
    let q1 = 0;
    let q2 = 0;
    let q3 = 0;
    let q4 = 0;
    rows.forEach((r) => {
      q1 += r.q1Amount;
      q2 += r.q2Amount;
      q3 += r.q3Amount;
      q4 += r.q4Amount;
    });
    return {
      q1,
      q2,
      q3,
      q4,
      total: totalExpenses > 0 ? totalExpenses : q1 + q2 + q3 + q4,
    };
  }, [rows, totalExpenses]);

  // Flatten master rows + full-width detail rows for AG Grid Community
  const displayRowData = useMemo<GridRowItem[]>(() => {
    const result: GridRowItem[] = [];
    rows.forEach((r) => {
      const isExpanded = expandedIds.has(r.id);

      // 1. Master row
      result.push({
        ...r,
        isDetailRow: false,
        isExpanded,
        categoryRow: r,
      });

      // 2. Full-width detail row right below if expanded
      if (isExpanded) {
        result.push({
          id: `${r.id}_detail`,
          isDetailRow: true,
          categoryRow: r,
        });
      }
    });
    return result;
  }, [rows, expandedIds]);

  // Reset row heights whenever expanded state changes so AG Grid adjusts height immediately
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.resetRowHeights();
    }
  }, [displayRowData]);

  // Pinned bottom summary row matching Image 1
  const pinnedBottomRowData = useMemo<GridRowItem[]>(() => {
    return [
      {
        id: 'pinned_total_expenses',
        categoryName: 'Total expenses',
        iconName: 'calculator',
        isFixed: true,
        order: 9999,
        q1Amount: totals.q1,
        q2Amount: totals.q2,
        q3Amount: totals.q3,
        q4Amount: totals.q4,
        totalAmount: totals.total,
        transactionCount: 0,
        transactions: [],
        isDetailRow: false,
      },
    ];
  }, [totals]);

  // Full-width detail cell renderer for AG Grid Community (free)
  const FullWidthDetailRenderer = useCallback((props: any) => {
    const categoryRow = props.data?.categoryRow as CategoryQuarterlyRow;
    if (!categoryRow) return null;
    return (
      <div className="w-full h-full bg-[#F8FAFB] dark:bg-[#061524]">
        <CategoryDetailRenderer
          data={categoryRow}
          propertyId={propertyId}
          financialYear={financialYear}
        />
      </div>
    );
  }, [propertyId, financialYear]);

  // Category cell renderer showing Chevron, Icon, and Label
  // NOTE: Uses props.data.isExpanded so colDefs does not need to re-create on each toggle!
  const CategoryCell = useCallback((props: CustomCellRendererProps<GridRowItem>) => {
    const { data, node } = props;
    if (!data || data.isDetailRow) return null;
    const isPinned = node.isRowPinned();
    const isExpanded = Boolean(data.isExpanded);

    if (isPinned) {
      return (
        <div className="flex items-center gap-2 pl-4 py-1 font-bold text-slate-900 dark:text-white text-sm sm:text-base">
          <span>{data.categoryName}</span>
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

        {/* Category Icon Badge */}
        <div
          className={cn(
            'p-1.5 rounded-lg shrink-0 transition-colors',
            isExpanded
              ? 'bg-[#238358] text-white shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          )}
        >
          <CategoryIcon name={data.iconName || 'tag'} className="w-4 h-4" />
        </div>

        {/* Category Label */}
        <span
          className={cn(
            'text-xs sm:text-sm truncate font-medium',
            isExpanded
              ? 'font-bold text-slate-900 dark:text-white'
              : 'text-slate-800 dark:text-slate-200'
          )}
        >
          {data.categoryName}
        </span>
      </div>
    );
  }, []);

  // Stable Column definitions matching Image 1
  const colDefs = useMemo<ColDef<GridRowItem>[]>(() => {
    return [
      {
        colId: 'category',
        headerName: 'Category',
        field: 'categoryName',
        cellRenderer: CategoryCell,
        minWidth: 280,
        flex: 2,
        sortable: false,
        filter: false,
        headerClass: 'text-left font-semibold text-slate-700 dark:text-slate-300 text-xs border-r border-slate-200/80 dark:border-slate-800',
        cellClass: 'border-r border-slate-100 dark:border-slate-800/80',
      },
      {
        colId: 'q1',
        field: 'q1Amount',
        headerComponent: () => <QuarterHeaderComponent title="Jul - Sep" quarter="Q1" />,
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 120,
        flex: 1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-medium border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned()
              ? 'font-bold text-slate-900 dark:text-white text-sm sm:text-base'
              : params.value > 0
              ? 'text-slate-900 dark:text-slate-100 font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          ),
      },
      {
        colId: 'q2',
        field: 'q2Amount',
        headerComponent: () => <QuarterHeaderComponent title="Oct - Dec" quarter="Q2" />,
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 120,
        flex: 1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-medium border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned()
              ? 'font-bold text-slate-900 dark:text-white text-sm sm:text-base'
              : params.value > 0
              ? 'text-slate-900 dark:text-slate-100 font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          ),
      },
      {
        colId: 'q3',
        field: 'q3Amount',
        headerComponent: () => <QuarterHeaderComponent title="Jan - Mar" quarter="Q3" />,
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 120,
        flex: 1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-medium border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned()
              ? 'font-bold text-slate-900 dark:text-white text-sm sm:text-base'
              : params.value > 0
              ? 'text-slate-900 dark:text-slate-100 font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          ),
      },
      {
        colId: 'q4',
        field: 'q4Amount',
        headerComponent: () => <QuarterHeaderComponent title="Apr - Jun" quarter="Q4" />,
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 120,
        flex: 1,
        sortable: false,
        headerClass: 'text-center border-r border-slate-200/80 dark:border-slate-800',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-medium border-r border-slate-100 dark:border-slate-800/80',
            params.node.isRowPinned()
              ? 'font-bold text-slate-900 dark:text-white text-sm sm:text-base'
              : params.value > 0
              ? 'text-slate-900 dark:text-slate-100 font-semibold'
              : 'text-slate-400 dark:text-slate-500'
          ),
      },
      {
        colId: 'total',
        field: 'totalAmount',
        headerComponent: () => (
          <div className="w-full text-center font-bold text-slate-900 dark:text-white text-xs">
            Total
          </div>
        ),
        valueFormatter: (p) => formatReportCurrency(p.value),
        minWidth: 140,
        flex: 1.2,
        sortable: false,
        headerClass: 'text-center font-bold text-slate-900 dark:text-white text-xs',
        cellClass: (params) =>
          cn(
            'flex items-center justify-center tabular-nums text-center text-xs sm:text-sm font-bold',
            params.node.isRowPinned()
              ? 'text-slate-900 dark:text-white text-sm sm:text-base'
              : params.value > 0
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-400 dark:text-slate-500'
          ),
      },
    ];
  }, [CategoryCell]);

  // Click on any category row to expand or collapse cleanly (single source of click truth)
  const onRowClicked = useCallback((e: RowClickedEvent<GridRowItem>) => {
    if (e.node.isRowPinned() || e.data?.isDetailRow) return;
    if (e.data?.id) {
      toggleCategory(e.data.id);
    }
  }, [toggleCategory]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* AG Grid Container */}
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
                const txCount = params.node.data?.categoryRow?.transactions?.length || 0;
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

      {/* Grid Footnote matching Image 1 */}
      <div className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Click a category row or amount to expand and collapse its transactions.</span>
      </div>
    </div>
  );
}
