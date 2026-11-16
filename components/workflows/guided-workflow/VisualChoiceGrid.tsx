'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface VisualChoiceGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  ariaLabel?: string;
  className?: string;
}

export function VisualChoiceGrid({
  children,
  columns = 2,
  ariaLabel = 'Select an option',
  className,
}: VisualChoiceGridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid gap-4 sm:gap-5 w-full', columnClasses[columns], className)}
    >
      {children}
    </div>
  );
}
