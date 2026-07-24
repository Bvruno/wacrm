'use client'

import { Bot, Send, Eye, Ban } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type AutoReplyMode = 'send' | 'suggest' | 'disabled'

interface AutoReplyModeSelectorProps {
  value: AutoReplyMode
  onChange: (value: AutoReplyMode) => void
  disabled?: boolean
}

const MODE_CONFIG: Record<AutoReplyMode, { icon: typeof Send; label: string; description: string }> = {
  send: {
    icon: Send,
    label: 'Auto-send',
    description: 'AI replies are sent automatically without human review.',
  },
  suggest: {
    icon: Eye,
    label: 'Suggest only',
    description: 'AI generates replies but waits for human approval before sending.',
  },
  disabled: {
    icon: Ban,
    label: 'Disabled',
    description: 'AI auto-reply is turned off for this agent.',
  },
}

export function AutoReplyModeSelector({
  value,
  onChange,
  disabled,
}: AutoReplyModeSelectorProps) {
  const currentMode = MODE_CONFIG[value]
  const Icon = currentMode.icon

  return (
    <div className="space-y-2">
      <Label>Auto-reply mode</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as AutoReplyMode)}
        disabled={disabled}
      >
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(MODE_CONFIG) as [AutoReplyMode, typeof MODE_CONFIG[AutoReplyMode]][]).map(
            ([mode, config]) => (
              <SelectItem key={mode} value={mode}>
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </div>
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{currentMode.description}</p>
    </div>
  )
}
