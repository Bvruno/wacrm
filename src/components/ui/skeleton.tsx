import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  shimmer,
}: {
  className?: string;
  shimmer?: boolean;
}) {
  return (
    <div
      className={cn(
        'bg-muted rounded-md',
        shimmer ? 'skeleton-shimmer' : 'animate-pulse',
        className
      )}
    />
  );
}
