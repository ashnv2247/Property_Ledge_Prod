import React from 'react';
import { PageSkeleton } from '@/components/ui/skeletons';

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative animate-in fade-in duration-150">
      {/* Top subtle navigation progress shimmer */}
      <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-50 bg-admin-primary/10">
        <div className="h-full w-full skeleton-shimmer bg-admin-primary" />
      </div>
      <PageSkeleton className="opacity-40 transition-opacity duration-200" />
    </div>
  );
}

