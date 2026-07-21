'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlanForm } from '@/components/admin/plan-form'

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  currency: string
  interval: string
  sort_order: number
  is_active: boolean
  created_at: string
  features?: Record<string, unknown>
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>()

  useEffect(() => {
    fetch('/api/admin/plans')
      .then((res) => res.json())
      .then((data) => {
        setPlans(data)
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage subscription plans
          </p>
        </div>
        <Button onClick={() => { setEditingPlan(undefined); setFormOpen(true) }}>
          Create Plan
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Price:</span>{' '}
                  {plan.currency.toUpperCase()} {(plan.price / 100).toFixed(2)} / {plan.interval}
                </p>
                <p>
                  <span className="text-muted-foreground">Slug:</span> {plan.slug}
                </p>
                <p>
                  <span className="text-muted-foreground">Sort:</span> {plan.sort_order}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => { setEditingPlan(plan); setFormOpen(true) }}
              >
                Edit
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <PlanForm
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editingPlan}
      />
    </div>
  )
}
