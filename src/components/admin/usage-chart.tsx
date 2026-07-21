'use client'

interface UsageChartProps {
  data: { label: string; value: number }[]
  title: string
  height?: number
}

export function UsageChart({ data, title, height = 200 }: UsageChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium text-card-foreground">{title}</h3>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d) => (
          <div
            key={d.label}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div
              className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
              style={{ height: `${(d.value / max) * 100}%` }}
            />
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      {data.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No data available
        </p>
      )}
    </div>
  )
}
