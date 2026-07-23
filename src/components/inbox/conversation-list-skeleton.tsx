import { Skeleton } from '@/components/ui/skeleton'

export function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-2">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" shimmer />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" shimmer />
              <Skeleton className="h-3 w-10 shrink-0" shimmer />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 flex-1" shimmer />
              <Skeleton className="h-2 w-2 shrink-0 rounded-full" shimmer />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
