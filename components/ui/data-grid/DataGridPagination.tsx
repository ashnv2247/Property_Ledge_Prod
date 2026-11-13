'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Select } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface DataGridPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  labelSingular?: string;
  labelPlural?: string;
}

export function DataGridPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  labelSingular = 'item',
  labelPlural = 'items',
}: DataGridPaginationProps) {
  const from = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const to = totalItems > 0 ? Math.min(currentPage * pageSize, totalItems) : 0;
  const safeTotalPages = Math.max(1, totalPages);

  // Generate numbered pages window (up to 5 pages around current)
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(safeTotalPages);
      } else if (currentPage >= safeTotalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = safeTotalPages - 4; i <= safeTotalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(safeTotalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-admin-surface border-t border-admin-border select-none">
      {/* Left: Summary text */}
      <div className="text-body-sm text-admin-muted text-center sm:text-left">
        {totalItems > 0 ? (
          <span>
            Showing <strong className="font-semibold text-admin-foreground">{from}</strong> to{' '}
            <strong className="font-semibold text-admin-foreground">{to}</strong> of{' '}
            <strong className="font-semibold text-admin-foreground">{totalItems}</strong>{' '}
            {totalItems === 1 ? labelSingular : labelPlural}
          </span>
        ) : (
          <span>0 {labelPlural}</span>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-admin-muted hidden md:inline">Rows per page:</span>
            <div className="w-20">
              <Select
                value={pageSize.toString()}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                options={pageSizeOptions.map((opt) => ({
                  value: opt.toString(),
                  label: opt.toString(),
                }))}
              />
            </div>
          </div>
        )}

        {/* Page Nav Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className={cn(
              'p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
            )}
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={cn(
              'p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
            )}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numbered pages */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-admin-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={cn(
                    'min-w-8 h-8 px-2 text-xs font-semibold rounded-lg transition-colors',
                    p === currentPage
                      ? 'bg-admin-primary text-white shadow-xs'
                      : 'text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle'
                  )}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= safeTotalPages}
            className={cn(
              'p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
            )}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(safeTotalPages)}
            disabled={currentPage >= safeTotalPages}
            className={cn(
              'p-1.5 rounded-lg border border-admin-border text-admin-muted hover:text-admin-foreground hover:bg-admin-surface-subtle transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent'
            )}
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Backward compatibility alias
export const AdminDataGridPagination = DataGridPagination;
export type AdminDataGridPaginationProps = DataGridPaginationProps;

