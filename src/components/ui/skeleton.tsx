import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  shimmer,
}: {
  className?: string
  shimmer?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted',
        shimmer
          ? 'skeleton-shimmer'
          : 'animate-pulse',
        className,
      )}
    />
  )
}
