'use client'

import { useEffect, useState } from 'react'
import { History, Clock, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslations } from 'next-intl'

interface Draft {
  id: string
  draft_text: string
  parameters?: {
    tone_preset?: string | null
    temperature?: number | null
  } | null
  created_at: string
}

interface DraftHistoryProps {
  conversationId: string
  onSelectDraft: (text: string) => void
}

export function DraftHistory({ conversationId, onSelectDraft }: DraftHistoryProps) {
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(false)
  const t = useTranslations('Inbox.composer')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/ai/drafts?conversation_id=${conversationId}&limit=20`)
      .then((res) => res.json())
      .then((data) => setDrafts(data.drafts || []))
      .catch(() => setDrafts([]))
      .finally(() => setLoading(false))
  }, [open, conversationId])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const toneLabel = (tone: string | null | undefined) => {
    if (!tone) return null
    const labels: Record<string, string> = {
      formal: 'Formal',
      casual: 'Casual',
      friendly: 'Friendly',
      professional: 'Professional',
      empathetic: 'Empathetic',
      technical: 'Technical',
    }
    return labels[tone] || tone
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary">
        <History className="h-4 w-4" />
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{t('draftHistory') || 'Draft History'}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <History className="mb-2 h-8 w-8 text-muted-foreground/60" />
              <p>No previous drafts yet.</p>
              <p className="mt-1 text-xs">
                Generate a draft to see it here.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
              <div className="space-y-3 pr-3">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="group rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(draft.created_at)}
                      </div>
                      {draft.parameters?.tone_preset && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                          {toneLabel(draft.parameters.tone_preset)}
                        </span>
                      )}
                    </div>
                    <p className="mb-2 line-clamp-3 text-sm text-foreground">
                      {draft.draft_text}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => {
                        onSelectDraft(draft.draft_text)
                        setOpen(false)
                      }}
                    >
                      Use this draft
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
