import { Skeleton } from '@/components/ui/skeleton'

export function MessageThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      <div className="flex items-center justify-center">
        <Skeleton className="h-5 w-20 rounded-full" shimmer />
      </div>

      <div className="flex justify-start">
        <div className="max-w-[70%] space-y-2">
          <Skeleton className="h-8 w-48 rounded-2xl rounded-bl-sm" shimmer />
          <Skeleton className="h-4 w-32 rounded-2xl rounded-bl-sm" shimmer />
        </div>
      </div>

      <div className="flex justify-end">
        <div className="max-w-[70%] space-y-2">
          <Skeleton className="h-6 w-36 rounded-2xl rounded-br-sm" shimmer />
          <Skeleton className="h-12 w-56 rounded-2xl rounded-br-sm" shimmer />
        </div>
      </div>

      <div className="flex justify-start">
        <Skeleton className="h-32 w-56 rounded-2xl" shimmer />
      </div>

      <div className="mt-2 flex items-center justify-center">
        <Skeleton className="h-5 w-24 rounded-full" shimmer />
      </div>

      <div className="flex justify-end">
        <div className="max-w-[70%] space-y-2">
          <Skeleton className="h-10 w-64 rounded-2xl rounded-br-sm" shimmer />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[70%] space-y-2">
          <Skeleton className="h-6 w-40 rounded-2xl rounded-bl-sm" shimmer />
          <Skeleton className="h-8 w-52 rounded-2xl rounded-bl-sm" shimmer />
        </div>
      </div>
    </div>
  )
}
