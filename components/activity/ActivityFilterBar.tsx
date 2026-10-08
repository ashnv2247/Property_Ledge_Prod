'use client';

import React from 'react';
import { Search, Filter, Home, User, CheckSquare, X } from 'lucide-react';
import { usePropertyContext } from '@/components/property/PropertyContext';
import type { ActivityFilters, ActivityType } from '@/types/activity';

interface ActivityFilterBarProps {
  filters: ActivityFilters;
  onChange: (newFilters: ActivityFilters) => void;
  teamMembers: Array<{ id: string; name: string; avatarUrl?: string | null; role: string }>;
  activityTypes: ActivityType[];
  canViewAllActivities?: boolean;
}

export function ActivityFilterBar({
  filters,
  onChange,
  teamMembers,
  activityTypes,
  canViewAllActivities = true,
}: ActivityFilterBarProps) {
  const { availableProperties, selectedProperty, setSelectedProperty } = usePropertyContext();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'all') {
      setSelectedProperty(null);
      onChange({ ...filters, propertyId: 'all' });
    } else {
      const prop = availableProperties.find((p) => p.propertyId === val);
      if (prop) setSelectedProperty(prop);
      onChange({ ...filters, propertyId: val });
    }
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, assignedTo: e.target.value });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, activityTypeId: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, status: e.target.value });
  };

  const handleClear = () => {
    setSelectedProperty(null);
    onChange({
      propertyId: 'all',
      assignedTo: 'all',
      activityTypeId: 'all',
      status: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters = Boolean(
    (filters.propertyId && filters.propertyId !== 'all') ||
    (filters.assignedTo && filters.assignedTo !== 'all') ||
    (filters.activityTypeId && filters.activityTypeId !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    (filters.searchQuery && filters.searchQuery.trim() !== '')
  );

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-surface dark:bg-[#0B1320] border border-border dark:border-[#1E293B] shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted dark:text-slate-400" />
        <input
          type="text"
          placeholder="Search activities, properties, assignees..."
          value={filters.searchQuery || ''}
          onChange={handleSearchChange}
          className="w-full pl-9 pr-3.5 py-1.5 bg-surface-subtle dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl text-xs text-foreground dark:text-slate-100 placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-[#008F83] transition-all"
        />
      </div>

      {/* Filter Selects */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {/* Property Select */}
        <select
          value={selectedProperty ? selectedProperty.propertyId : filters.propertyId || 'all'}
          onChange={handlePropertyChange}
          className="bg-surface-subtle dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-2.5 py-1.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:border-[#008F83] shrink-0"
        >
          <option value="all">All Properties</option>
          {availableProperties.map((p) => (
            <option key={p.propertyId} value={p.propertyId}>
              {p.propertyName}
            </option>
          ))}
        </select>

        {/* Responsible Person Select (Only shown if canViewAllActivities) */}
        {canViewAllActivities ? (
          <select
            value={filters.assignedTo || 'all'}
            onChange={handleAssigneeChange}
            className="bg-surface-subtle dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-2.5 py-1.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:border-[#008F83] shrink-0"
          >
            <option value="all">All Assignees</option>
            <option value="me">Assigned to Me</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#008F83]/10 border border-[#008F83]/20 rounded-xl text-xs font-semibold text-[#008F83] dark:text-[#32D5C4] shrink-0">
            <User className="w-3.5 h-3.5" />
            <span>Assigned to You</span>
          </div>
        )}

        {/* Activity Type Select */}
        <select
          value={filters.activityTypeId || 'all'}
          onChange={handleTypeChange}
          className="bg-surface-subtle dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-2.5 py-1.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:border-[#008F83] shrink-0"
        >
          <option value="all">All Activity Types</option>
          {activityTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Status Select */}
        <select
          value={filters.status || 'all'}
          onChange={handleStatusChange}
          className="bg-surface-subtle dark:bg-[#080D1A] border border-border dark:border-[#1E2D4A] rounded-xl px-2.5 py-1.5 text-xs text-foreground dark:text-slate-200 focus:outline-none focus:border-[#008F83] shrink-0"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="delayed">Delayed</option>
          <option value="completed">Completed</option>
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
