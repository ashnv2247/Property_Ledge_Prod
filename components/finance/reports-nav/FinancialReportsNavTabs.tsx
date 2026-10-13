'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, Calendar, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FinancialReportsSection = 'reports' | 'financial-years' | 'accountant-reports';

interface FinancialReportsNavTabsProps {
  activeSection?: FinancialReportsSection;
  className?: string;
  useQueryParam?: boolean;
}

export function FinancialReportsNavTabs({
  activeSection: propActiveSection,
  className,
  useQueryParam = false,
}: FinancialReportsNavTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSectionParam = searchParams.get('section') as FinancialReportsSection | null;

  // Resolve active section from props, query param, or pathname
  let activeSection: FinancialReportsSection = propActiveSection || 'reports';
  if (!propActiveSection) {
    if (pathname.includes('/financial-years') || currentSectionParam === 'financial-years') {
      activeSection = 'financial-years';
    } else if (pathname.includes('/accountant-reports') || currentSectionParam === 'accountant-reports') {
      activeSection = 'accountant-reports';
    } else {
      activeSection = 'reports';
    }
  }

  const tabs: Array<{
    id: FinancialReportsSection;
    label: string;
    badge: string;
    href: string;
    icon: React.ElementType;
    description: string;
  }> = [
    {
      id: 'reports',
      label: 'Reports',
      badge: 'Insights & Trends',
      href: useQueryParam ? '/dashboard/reports?section=reports' : '/dashboard/reports',
      icon: BarChart3,
      description: 'Cash flow, rental yields, expense classifications & analytics',
    },
    {
      id: 'financial-years',
      label: 'Financial Years',
      badge: 'Statutory AFY',
      href: useQueryParam ? '/dashboard/reports?section=financial-years' : '/dashboard/financial-years',
      icon: Calendar,
      description: 'July–June periods, status tracking & period reconciliation',
    },
    {
      id: 'accountant-reports',
      label: 'Accountant Reports',
      badge: 'BAS & Tax Packs',
      href: useQueryParam ? '/dashboard/reports?section=accountant-reports' : '/dashboard/accountant-reports',
      icon: FileSpreadsheet,
      description: 'ATO BAS statements, receipts audit trail & multi-page PDF packs',
    },
  ];

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-[#08182A] border border-slate-200/80 dark:border-white/[0.08] shadow-xs">
        <nav
          className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 w-full"
          aria-label="Reports Navigation"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 select-none text-left group',
                  isActive
                    ? 'bg-white dark:bg-[#008F83] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-transparent'
                    : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/[0.05]'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg shrink-0 transition-colors',
                    isActive
                      ? 'bg-[#008F83]/10 dark:bg-white/15 text-[#008F83] dark:text-white'
                      : 'bg-slate-200/60 dark:bg-white/[0.06] text-slate-500 dark:text-[#7F8B99] group-hover:text-slate-800 dark:group-hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-tight truncate block">
                      {tab.label}
                    </span>
                    <span
                      className={cn(
                        'hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold leading-none',
                        isActive
                          ? 'bg-[#008F83]/10 dark:bg-white/20 text-[#008F83] dark:text-white'
                          : 'bg-slate-200/70 dark:bg-white/[0.08] text-slate-500 dark:text-[#94A3B8]'
                      )}
                    >
                      {tab.badge}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] truncate block mt-0.5',
                      isActive
                        ? 'text-slate-500 dark:text-white/80'
                        : 'text-slate-400 dark:text-[#7F8B99]'
                    )}
                  >
                    {tab.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
