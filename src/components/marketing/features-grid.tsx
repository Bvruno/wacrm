import type { LucideIcon } from 'lucide-react'
import { FeatureCard } from './feature-card'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

interface FeaturesGridProps {
  features: Feature[]
  columns?: 2 | 3
}

export function FeaturesGrid({ features, columns = 3 }: FeaturesGridProps) {
  return (
    <div
      className={
        columns === 3
          ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid gap-6 sm:grid-cols-2'
      }
    >
      {features.map((feature, i) => (
        <FeatureCard key={i} {...feature} />
      ))}
    </div>
  )
}
