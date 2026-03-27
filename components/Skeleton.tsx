"use client";

interface Props {
  className?: string;
}

export function SkeletonBlock({ className = "" }: Props) {
  return <div className={`skeleton ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface border border-stroke rounded-xl p-4 space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-7 w-28" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-surface border border-stroke rounded-xl p-4 space-y-3">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
