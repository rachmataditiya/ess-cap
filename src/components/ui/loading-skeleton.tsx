import { Loader2 } from "lucide-react";

export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen flex-col">
      <Loader2 className="h-8 w-8 animate-spin text-teal mb-3" />
      <p className="text-slate-600">Loading...</p>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <SkeletonHeader />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonList />
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-3/5 bg-slate-200 rounded-md animate-pulse" />
      <div className="h-4 w-4/5 bg-slate-100 rounded-md animate-pulse" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="w-full p-4 border border-slate-200 rounded-xl bg-white space-y-3">
      <div className="h-5 w-1/3 bg-slate-200 rounded-md animate-pulse" />
      <div className="h-20 bg-slate-100 rounded-md animate-pulse" />
      <div className="h-4 w-1/2 bg-slate-200 rounded-md animate-pulse" />
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="w-full space-y-2">
      <div className="h-5 w-1/4 bg-slate-200 rounded-md animate-pulse mb-3" />
      <div className="h-12 w-full border border-slate-200 rounded-lg bg-white flex items-center px-3 animate-pulse" />
      <div className="h-12 w-full border border-slate-200 rounded-lg bg-white flex items-center px-3 animate-pulse" />
      <div className="h-12 w-full border border-slate-200 rounded-lg bg-white flex items-center px-3 animate-pulse" />
    </div>
  );
}