'use client';

import React from 'react';

interface QuarterHeaderProps {
  displayName?: string;
  quarter?: string;
  title?: string;
}

export function QuarterHeaderComponent({
  title = '',
  quarter = '',
}: QuarterHeaderProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full py-1 leading-tight text-center select-none">
      <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
        {title}
      </span>
      {quarter && (
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {quarter}
        </span>
      )}
    </div>
  );
}
