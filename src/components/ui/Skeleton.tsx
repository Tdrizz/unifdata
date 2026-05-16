import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[6px] bg-ud-surface-soft", className)}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[14px] border border-ud bg-ud-surface p-[20px] space-y-[14px]", className)}>
      <Skeleton className="h-[12px] w-[30%]" />
      <Skeleton className="h-[20px] w-[60%]" />
      <Skeleton className="h-[12px] w-[80%]" />
      <Skeleton className="h-[12px] w-[50%]" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-[12px] py-[12px]", className)}>
      <Skeleton className="h-[36px] w-[36px] rounded-full shrink-0" />
      <div className="flex-1 space-y-[8px]">
        <Skeleton className="h-[12px] w-[40%]" />
        <Skeleton className="h-[10px] w-[60%]" />
      </div>
      <Skeleton className="h-[22px] w-[60px] rounded-full shrink-0" />
    </div>
  );
}
