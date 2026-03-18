"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer-bg rounded-lg", className)}
      {...props}
    />
  );
}

export function ResultCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 space-y-4 animate-pulse">
      {/* Thumbnail strip */}
      <div className="flex gap-2">
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
        <Skeleton className="h-20 flex-1 rounded-xl" />
      </div>
      {/* Title */}
      <Skeleton className="h-5 w-3/4 rounded" />
      {/* Meta row */}
      <div className="flex gap-3">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      {/* Explanation */}
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  );
}

export function SearchBarSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="flex gap-2 mt-4 justify-center">
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>
    </div>
  );
}
