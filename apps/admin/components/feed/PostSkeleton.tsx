import React from "react";
import { cn } from "@/lib/utils";

export default function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-whatsapp-dark border-b border-gray-100 dark:border-white/5 mb-6 w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded-full" />
          <div className="h-2 w-16 bg-gray-100 dark:bg-white/5 rounded-full" />
        </div>
      </div>

      {/* Media Skeleton */}
      <div className="w-full aspect-[4/5] bg-gray-200 dark:bg-white/5" />

      {/* Footer Skeleton */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-5 w-5 bg-gray-200 dark:bg-white/10 rounded-full" />
            <div className="h-5 w-5 bg-gray-200 dark:bg-white/10 rounded-full" />
            <div className="h-5 w-5 bg-gray-200 dark:bg-white/10 rounded-full" />
          </div>
          <div className="h-5 w-5 bg-gray-200 dark:bg-white/10 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full" />
          <div className="h-3 w-2/3 bg-gray-100 dark:bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
