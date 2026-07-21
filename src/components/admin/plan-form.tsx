'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PlanFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: {
    id: string
    name: string
    slug: string
    description: string | null
    price: number
    currency: string
    interval: string
    sort_order: number
    is_active: boolean
    features?: Record<string, unknown>
  }
}

export function PlanForm({ open, onOpenChange, plan }: PlanFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(plan?.name ?? '')
  const [slug, setSlug] = useState(plan?.slug ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [price, setPrice] = useState(plan?.price ? String(plan.price) : '')
  const [currency, setCurrency] = useState(plan?.currency ?? 'usd')
  const [interval_, setInterval_] = useState(plan?.interval ?? 'month')
  const [sortOrder, setSortOrder] = useState(plan?.sort_order ? String(plan.sort_order) : '0')
  const [isActive, setIsActive] = useState(plan?.is_active ?? true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (plan?.features ?? {}) as any
  const [maxAgents, setMaxAgents] = useState(f.max_agents !== undefined ? String(f.max_agents) : '')
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState(f.max_messages_per_day !== undefined ? String(f.max_messages_per_day) : '')
  const [hasBroadcasts, setHasBroadcasts] = useState(f.has_broadcasts ?? false)
  const [hasAutomations, setHasAutomations] = useState(f.has_automations ?? false)
  const [hasAiAssistant, setHasAiAssistant] = useState(f.has_ai_assistant ?? false)

  const handleSubmit = async () => {
    setLoading(true)
    const body = {
      name,
      slug,
      description,
      price: parseInt(price),
      currency,
      interval: interval_,
      sort_order: parseInt(sortOrder),
      is_active: isActive,
      features: {
        max_agents: maxAgents ? parseInt(maxAgents) : -1,
        max_messages_per_day: maxMessagesPerDay ? parseInt(maxMessagesPerDay) : -1,
        has_broadcasts: hasBroadcasts,
        has_automations: hasAutomations,
        has_ai_assistant: hasAiAssistant,
      },
    }
    const res = await fetch(
      plan ? `/api/admin/plans/${plan.id}` : '/api/admin/plans',
      {
        method: plan ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (res.ok) {
      router.refresh()
      onOpenChange(false)
    } else {
      alert('Failed to save plan')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          <DialogDescription>
            {plan ? 'Update plan details.' : 'Add a new subscription plan.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Price (cents)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Interval</Label>
              <Select value={interval_} onValueChange={(v) => setInterval_(v ?? 'month')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="year">year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium">Features & Limits</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max agents (-1 = unlimited)</Label>
                <Input type="number" value={maxAgents} onChange={(e) => setMaxAgents(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max messages/day (-1 = unlimited)</Label>
                <Input type="number" value={maxMessagesPerDay} onChange={(e) => setMaxMessagesPerDay(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={hasBroadcasts} onCheckedChange={setHasBroadcasts} />
                <Label>Broadcasts</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={hasAutomations} onCheckedChange={setHasAutomations} />
                <Label>Automations</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={hasAiAssistant} onCheckedChange={setHasAiAssistant} />
                <Label>AI Assistant</Label>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {plan ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
