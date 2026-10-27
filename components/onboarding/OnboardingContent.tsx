import React from 'react';
import { cn } from '@/lib/utils';

interface OnboardingContentProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function OnboardingContent({ children, className, fullWidth }: OnboardingContentProps) {
  return (
    <div className={cn('flex flex-1 flex-col justify-center px-4 py-4 sm:px-6 lg:px-8', fullWidth && 'px-1 py-1 sm:px-2 lg:px-2', className)}>
      <div className={cn('mx-auto w-full', fullWidth ? 'max-w-5xl' : 'max-w-[560px]')}>{children}</div>
    </div>
  );
}
