'use client';

import React from 'react';
import Image from 'next/image';
import { Home, Users, Clock, UserPlus, UserCheck, Plus } from 'lucide-react';
import { Button } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export interface TenantOverviewBannerProps {
  totalTenants: number;
  activeResidents: number;
  pastResidents: number;
  prospects: number;
  isLoading?: boolean;
  onSetupTenancy: () => void;
  className?: string;
}

export function TenantOverviewBanner({
  totalTenants,
  activeResidents,
  pastResidents,
  prospects,
  isLoading = false,
  onSetupTenancy,
  className,
}: TenantOverviewBannerProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-teal-600/30 overflow-hidden relative shadow-[0_4px_24px_rgba(0,143,131,0.18)] p-4 sm:p-5 lg:p-6',
        className
      )}
      style={{
        background:
          'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.12), transparent 45%), linear-gradient(120deg, #007F78 0%, #009B91 50%, #008F83 100%)',
      }}
    >
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-5 xl:gap-8 relative z-10">
        {/* LEFT: Tenant Lifestyle Image with Translucent Floating Pill Card */}
        <div className="relative w-full xl:w-[280px] 2xl:w-[320px] h-48 sm:h-52 xl:h-[200px] rounded-[18px] overflow-hidden shrink-0 group border border-white/20 shadow-md">
          <Image
            src="/images/tenant_banner_visual.jpg?v=2"
            alt="Australian Residents & Tenants Community"
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Floating Pill Card Over Image */}
          <div className="absolute bottom-3 left-3 px-3.5 py-2.5 rounded-[14px] bg-white/95 dark:bg-[#07111F]/95 backdrop-blur-md border border-white/40 shadow-lg min-w-[140px]">
            <span className="text-[11px] font-semibold text-slate-700 dark:text-[#94A3B8] block leading-none">
              Your Tenants
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-heading text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">
                {isLoading ? '—' : totalTenants}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium leading-none">
                {totalTenants === 1 ? 'Total Tenant' : 'Total Tenants'}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: Tenant Overview Title & 4 Prominent KPIs */}
        <div className="flex-1 flex flex-col justify-center min-w-0 py-0.5">
          <div className="mb-3">
            <h2 className="text-xl sm:text-[22px] font-heading font-bold text-white tracking-tight leading-tight">
              Tenant Overview
            </h2>
            <p className="text-xs sm:text-[13px] text-white/80 mt-0.5 font-normal">
              A snapshot of your tenants across all properties.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-3 xl:gap-3.5 pt-1">
            {/* Metric 1: Total Tenants */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.08] border border-white/12 min-w-0 backdrop-blur-xs">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Home className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xl sm:text-2xl font-bold tabular-nums text-white leading-none">
                  {isLoading ? '—' : totalTenants}
                </p>
                <span className="text-xs font-semibold text-white truncate block mt-1">
                  Total Tenants
                </span>
                <span className="text-[10px] text-white/75 truncate block leading-tight mt-0.5">
                  Across portfolio
                </span>
              </div>
            </div>

            {/* Metric 2: Active Residents */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.08] border border-white/12 min-w-0 backdrop-blur-xs">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xl sm:text-2xl font-bold tabular-nums text-white leading-none">
                  {isLoading ? '—' : activeResidents}
                </p>
                <span className="text-xs font-semibold text-white truncate block mt-1">
                  Active Residents
                </span>
                <span className="text-[10px] text-white/75 truncate block leading-tight mt-0.5">
                  Currently living
                </span>
              </div>
            </div>

            {/* Metric 3: Past Residents */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.08] border border-white/12 min-w-0 backdrop-blur-xs">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xl sm:text-2xl font-bold tabular-nums text-white leading-none">
                  {isLoading ? '—' : pastResidents}
                </p>
                <span className="text-xs font-semibold text-white truncate block mt-1">
                  Past Residents
                </span>
                <span className="text-[10px] text-white/75 truncate block leading-tight mt-0.5">
                  Moved out
                </span>
              </div>
            </div>

            {/* Metric 4: Prospects */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.08] border border-white/12 min-w-0 backdrop-blur-xs">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 shadow-xs">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-xl sm:text-2xl font-bold tabular-nums text-white leading-none">
                  {isLoading ? '—' : prospects}
                </p>
                <span className="text-xs font-semibold text-white truncate block mt-1">
                  Prospects
                </span>
                <span className="text-[10px] text-white/75 truncate block leading-tight mt-0.5">
                  Applicants
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Translucent Well-Managed Tenancies Action Panel */}
        <div className="w-full xl:w-64 2xl:w-72 p-4 sm:p-5 rounded-[20px] bg-white/10 border border-white/16 backdrop-blur-md shrink-0 flex flex-col justify-between relative overflow-hidden min-h-[160px] xl:min-h-[195px]">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                Well managed <br /> Tenancies
              </h3>
              <div className="w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/20">
                <Home className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
              Keep your tenants, leases and communications organized.
            </p>
          </div>

          <div className="mt-3.5 relative z-10">
            <Button
              onClick={onSetupTenancy}
              size="sm"
              className="w-full font-bold text-xs rounded-xl bg-white text-[#008F83] hover:bg-white/95 shadow-sm justify-center py-2 border-0"
              leftIcon={<Plus className="w-3.5 h-3.5 text-[#008F83]" />}
            >
              Setup Tenancy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

