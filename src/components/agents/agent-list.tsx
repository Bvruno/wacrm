'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Bot, Search } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { canEditSettings } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AgentCard } from './agent-card'
import { AgentForm } from './agent-form'
import type { Agent } from '@/types'
import { useTranslations } from 'next-intl'

export function AgentList() {
  const { accountId, accountRole } = useAuth()
  const canEdit = accountRole ? canEditSettings(accountRole) : false
  const t = useTranslations('Agents')

  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [search, setSearch] = useState('')

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      if (res.ok) {
        setAgents(data.agents || [])
      } else {
        toast.error(data.error || t('loadFailed'))
      }
    } catch {
      toast.error(t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (accountId) {
      void fetchAgents()
    }
  }, [accountId, fetchAgents])

  const handleCreate = () => {
    setEditingAgent(null)
    setShowForm(true)
  }

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setShowForm(true)
  }

  const handleDelete = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('deleteSuccess'))
        await fetchAgents()
      } else {
        const data = await res.json()
        toast.error(data.error || t('deleteFailed'))
      }
    } catch {
      toast.error(t('deleteFailed'))
    }
  }

  const handleToggleActive = async (agentId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (res.ok) {
        toast.success(isActive ? t('activated') : t('deactivated'))
        await fetchAgents()
      } else {
        const data = await res.json()
        toast.error(data.error || t('updateFailed'))
      }
    } catch {
      toast.error(t('updateFailed'))
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingAgent(null)
    void fetchAgents()
  }

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loading')}
      </div>
    )
  }

  if (showForm) {
    return (
      <AgentForm
        agent={editingAgent}
        onClose={handleFormClose}
        canEdit={canEdit}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchAgents')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createAgent')}
          </Button>
        )}
      </div>

      {filteredAgents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">{t('noAgents')}</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('noAgentsDescription')}
          </p>
          {canEdit && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createFirstAgent')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
