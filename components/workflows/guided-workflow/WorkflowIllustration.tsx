'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowIllustrationProps {
  lightSrc?: string;
  darkSrc?: string;
  alt: string;
  fallbackIcon?: LucideIcon;
  badge?: string;
  badgeTone?: 'teal' | 'amber' | 'slate';
  heightClassName?: string;
  className?: string;
}

export function WorkflowIllustration({
  lightSrc,
  darkSrc,
  alt,
  fallbackIcon: FallbackIcon,
  badge,
  badgeTone = 'teal',
  heightClassName = 'h-36',
  className,
}: WorkflowIllustrationProps) {
  const [hasError, setHasError] = useState(false);

  const effectiveDarkSrc = darkSrc || lightSrc;

  const badgeColors = {
    teal: 'bg-[#008F83] text-white border-[#008F83]',
    amber: 'bg-amber-600 text-white border-amber-600',
    slate: 'bg-slate-700 text-white border-slate-700',
  };

  return (
    <div
      className={cn(
        'relative w-full flex items-center justify-center transition-all overflow-hidden select-none',
        heightClassName,
        className
      )}
    >
      {lightSrc && !hasError ? (
        <>
          {/* Light Mode Illustration */}
          <div className="relative w-full h-full flex items-center justify-center dark:hidden">
            <Image
              src={lightSrc}
              alt={alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 420px"
              onError={() => setHasError(true)}
              priority={false}
            />
          </div>

          {/* Dark Mode Illustration */}
          <div className="relative w-full h-full items-center justify-center hidden dark:flex">
            <Image
              src={effectiveDarkSrc!}
              alt={alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 420px"
              onError={() => setHasError(true)}
              priority={false}
            />
          </div>
        </>
      ) : FallbackIcon ? (
        <div className="w-16 h-16 rounded-2xl bg-[#008F83]/10 dark:bg-[#008F83]/20 flex items-center justify-center text-[#008F83]">
          <FallbackIcon className="w-8 h-8" />
        </div>
      ) : null}

      {badge && (
        <div className="absolute top-1 right-1 z-10 pointer-events-none">
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-md',
              badgeColors[badgeTone]
            )}
          >
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}
