import { Skeleton } from '@/components/ui/skeleton'

export function ContactsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-border">
          <td className="p-3">
            <Skeleton className="h-4 w-4 rounded" shimmer />
          </td>
          <td className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" shimmer />
              <Skeleton className="h-4 w-28" shimmer />
            </div>
          </td>
          <td className="p-3">
            <Skeleton className="h-4 w-36" shimmer />
          </td>
          <td className="p-3">
            <Skeleton className="h-4 w-40" shimmer />
          </td>
          <td className="p-3">
            <div className="flex gap-1">
              <Skeleton className="h-5 w-14 rounded-full" shimmer />
              <Skeleton className="h-5 w-12 rounded-full" shimmer />
            </div>
          </td>
          <td className="p-3">
            <Skeleton className="h-4 w-20" shimmer />
          </td>
          <td className="p-3">
            <Skeleton className="h-4 w-24" shimmer />
          </td>
          <td className="p-3">
            <Skeleton className="h-4 w-16" shimmer />
          </td>
          <td className="p-3">
            <Skeleton className="h-8 w-8 rounded" shimmer />
          </td>
        </tr>
      ))}
    </>
  )
}
