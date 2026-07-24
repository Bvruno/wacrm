'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from 'next-intl'

interface ReasoningDisplayProps {
  reasoning: string
  context?: {
    knowledgeChunks?: number
    contactProfile?: string | null
    tonePreset?: string | null
  } | null
}

export function ReasoningDisplay({ reasoning, context }: ReasoningDisplayProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('Inbox.aiBanner')

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => setOpen(!open)}
      >
        <Brain className="h-3.5 w-3.5" />
        {t('viewReasoning') || 'View reasoning'}
        {open ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t('reasoningTitle') || 'Why the AI responded this way'}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {reasoning}
            </p>
            {context && (
              <div className="mt-3 flex flex-wrap gap-2">
                {context.knowledgeChunks !== undefined && (
                  <Badge variant="outline" className="text-[10px]">
                    {context.knowledgeChunks} KB chunks
                  </Badge>
                )}
                {context.contactProfile && (
                  <Badge variant="outline" className="text-[10px]">
                    Contact profile
                  </Badge>
                )}
                {context.tonePreset && (
                  <Badge variant="outline" className="text-[10px]">
                    Tone: {context.tonePreset}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
