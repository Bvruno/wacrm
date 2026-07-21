'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Users,
  Smartphone,
  Calendar,
  Activity,
} from 'lucide-react'

interface AccountDetail {
  id: string
  name: string
  created_at: string
  deleted_at: string | null
  plan?: {
    plan: {
      id: string
      name: string
      slug: string
      price: number
      currency: string
      features: Record<string, unknown>
    }
    status: string
    trial_ends_at: string | null
  } | null
  members?: { id: string; email: string; full_name: string | null; role: string }[]
}

interface SubscriptionPlan {
  id: string
  name: string
  slug: string
}

interface AccountDetailCardProps {
  account: AccountDetail
  plans: SubscriptionPlan[]
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function FeatureCheck({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {enabled ? (
        <CheckCircle2 className="size-4 text-emerald-500" />
      ) : (
        <XCircle className="size-4 text-muted-foreground/50" />
      )}
      <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}

export function AccountDetailCard({ account, plans }: AccountDetailCardProps) {
  const router = useRouter()
  const [suspendReason, setSuspendReason] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<{ agents: { current: number; max: number }; messagesToday: { current: number; max: number } } | null>(null)

  const planStatus = account.plan?.status ?? 'active'
  const isSuspended = planStatus === 'suspended'
  const isDeleted = !!account.deleted_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = (account.plan?.plan?.features ?? {}) as Record<string, any>

  useEffect(() => {
    if (account.id) {
      fetch(`/api/admin/accounts/${account.id}/limits`)
        .then((r) => r.json())
        .then(setUsage)
    }
  }, [account.id])

  const act = async (action: string, body: Record<string, unknown> = {}) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Request failed')
      router.refresh()
    } catch {
      alert('Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{account.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="size-3.5" />
                Created {new Date(account.created_at).toLocaleDateString()}
                {isDeleted && ` · Deleted ${new Date(account.deleted_at!).toLocaleDateString()}`}
              </CardDescription>
            </div>
            <Badge className={statusColors[planStatus] ?? ''}>{planStatus}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Plan:</span>{' '}
              <span className="font-medium">{account.plan?.plan.name ?? 'Free'}</span>
              {account.plan && account.plan.plan.price > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({account.plan.plan.currency.toUpperCase()} {(account.plan.plan.price / 100).toFixed(2)})
                </span>
              )}
            </div>
            {account.plan?.trial_ends_at && (
              <div>
                <span className="text-muted-foreground">Trial ends:</span>{' '}
                {new Date(account.plan.trial_ends_at).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Plan features */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <FeatureCheck label="Broadcasts" enabled={!!features.has_broadcasts} />
            <FeatureCheck label="Automations" enabled={!!features.has_automations} />
            <FeatureCheck label="AI Assistant" enabled={!!features.has_ai_assistant} />
            <FeatureCheck label="Public API" enabled={!!features.has_public_api} />
          </div>

          {!isDeleted && (
            <div className="flex flex-wrap gap-2 pt-2">
              {isSuspended ? (
                <Button variant="default" size="sm" disabled={loading} onClick={() => act('reactivate')}>
                  Reactivate
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger render={<Button variant="outline" size="sm" />}>Suspend</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Suspend Account</DialogTitle>
                      <DialogDescription>This will prevent all members from accessing the account.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>Reason (optional)</Label>
                      <Input value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Reason for suspension" />
                    </div>
                    <DialogFooter>
                      <Button disabled={loading} onClick={() => act('suspend', { reason: suspendReason })}>Confirm Suspend</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog>
                <DialogTrigger render={<Button variant="outline" size="sm" />}>Change Plan</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Plan</DialogTitle>
                    <DialogDescription>Select a new subscription plan for this account.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select value={selectedPlanId} onValueChange={(v) => setSelectedPlanId(v ?? '')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.slug})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button disabled={loading || !selectedPlanId} onClick={() => act('plan', { plan_id: selectedPlanId })}>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger render={<Button variant="destructive" size="sm" />}>Delete</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>This will soft-delete the account and detach all members.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Reason (optional)</Label>
                    <Input value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="Reason for deletion" />
                    <Label>Type <strong>confirm</strong> to proceed</Label>
                    <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder='Type "confirm"' />
                  </div>
                  <DialogFooter>
                    <Button variant="destructive" disabled={loading || deleteConfirm !== 'confirm'} onClick={() => act('delete', { confirm: true, reason: deleteReason })}>Delete Account</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="size-4" />
            Usage & Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="size-3.5" />
                Agents
              </div>
              <p className="text-2xl font-bold">
                {usage?.agents.current ?? '?'}
                <span className="text-sm font-normal text-muted-foreground">
                  /{usage?.agents.max === -1 ? '∞' : usage?.agents.max ?? '?'}
                </span>
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MessageSquare className="size-3.5" />
                Messages today
              </div>
              <p className="text-2xl font-bold">
                {usage?.messagesToday.current ?? '?'}
                <span className="text-sm font-normal text-muted-foreground">
                  /{usage?.messagesToday.max === -1 ? '∞' : usage?.messagesToday.max ?? '?'}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="size-4" />
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <Smartphone className="size-3.5 inline mr-1" />
            Integración WhatsApp — ver en <a href={`/settings?tab=whatsapp`} className="text-primary hover:underline">Settings → WhatsApp</a>
          </p>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="size-4" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(account.members ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No members</p>
            ) : (
              (account.members ?? []).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{member.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
