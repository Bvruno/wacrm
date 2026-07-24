'use client'

import { Bot, Edit, Trash2, Power, MoreVertical } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Agent } from '@/types'
import { useTranslations } from 'next-intl'

interface AgentCardProps {
  agent: Agent
  onEdit: (agent: Agent) => void
  onDelete: (agentId: string) => void
  onToggleActive: (agentId: string, isActive: boolean) => void
  canEdit: boolean
}

export function AgentCard({
  agent,
  onEdit,
  onDelete,
  onToggleActive,
  canEdit,
}: AgentCardProps) {
  const t = useTranslations('Agents')

  const providerLabel = agent.provider === 'openai' ? 'OpenAI' : 'Anthropic'

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {providerLabel} · {agent.model}
              </p>
            </div>
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(agent)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToggleActive(agent.id, !agent.is_active)}
                >
                  <Power className="mr-2 h-4 w-4" />
                  {agent.is_active ? t('deactivate') : t('activate')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(agent.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {agent.description && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {agent.description}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Badge variant={agent.is_active ? 'default' : 'secondary'}>
            {agent.is_active ? t('active') : t('inactive')}
          </Badge>
          {agent.auto_reply_enabled && agent.is_active && (
            <Badge variant="outline">{t('autoReply')}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
