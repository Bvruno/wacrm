'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface Variation {
  tone: string
  toneLabel: string
  draft: string
}

interface DraftVariationsProps {
  conversationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectVariation: (text: string) => void
}

export function DraftVariations({
  conversationId,
  open,
  onOpenChange,
  onSelectVariation,
}: DraftVariationsProps) {
  const [variations, setVariations] = useState<Variation[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const t = useTranslations('Inbox.composer')

  const generateVariations = async () => {
    setLoading(true)
    setVariations([])
    setSelectedIdx(null)
    try {
      const res = await fetch('/api/ai/drafts/variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId }),
      })
      const data = await res.json()
      if (res.ok && data.variations) {
        setVariations(data.variations)
      } else {
        toast.error(data.error || 'Failed to generate variations')
      }
    } catch {
      toast.error('Failed to generate variations')
    } finally {
      setLoading(false)
    }
  }

  const toneColors: Record<string, string> = {
    formal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    casual: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    friendly: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    empathetic: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    technical: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v)
      if (v) generateVariations()
    }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('draftVariations') || 'Draft Variations'}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating 3 variations with different tones...
              </p>
            </div>
          ) : variations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No variations generated yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {variations.map((v, idx) => (
                <div
                  key={v.tone}
                  className={`relative rounded-lg border-2 p-4 transition-all ${
                    selectedIdx === idx
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Badge className={toneColors[v.tone] || ''}>
                      {v.toneLabel}
                    </Badge>
                    {selectedIdx === idx && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <ScrollArea className="h-48">
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {v.draft}
                    </p>
                  </ScrollArea>
                  <Button
                    variant={selectedIdx === idx ? 'default' : 'outline'}
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setSelectedIdx(idx)}
                  >
                    {selectedIdx === idx ? 'Selected' : 'Select'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedIdx !== null && variations[selectedIdx]) {
                onSelectVariation(variations[selectedIdx].draft)
                onOpenChange(false)
              }
            }}
            disabled={selectedIdx === null || loading}
          >
            Use Selected
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
