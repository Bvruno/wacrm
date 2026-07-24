'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  RefreshCw,
  BookOpen,
  Upload,
  Link2,
  FileText,
  Globe,
  Eye,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'

interface DocSummary {
  id: string
  title: string
  source_type: 'text' | 'file' | 'url'
  file_url?: string | null
  file_size?: number | null
  file_type?: string | null
  url?: string | null
  usage_count: number
  updated_at: string
}

interface Chunk {
  id: string
  content: string
  chunk_index: number
}

type EditTarget = 'new' | string | null
type AddMode = 'text' | 'file' | 'url'

export function AiKnowledgeCardAdvanced({
  accountId,
  canEdit,
  hasEmbeddingsKey,
}: {
  accountId: string | null
  canEdit: boolean
  hasEmbeddingsKey: boolean
}) {
  const [docs, setDocs] = useState<DocSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EditTarget>(null)
  const [addMode, setAddMode] = useState<AddMode>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [chunksOpen, setChunksOpen] = useState(false)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [chunksLoading, setChunksLoading] = useState(false)
  const [editingChunk, setEditingChunk] = useState<Chunk | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadedAccountIdRef = useRef<string | null>(null)
  const t = useTranslations('Settings.aiKnowledge')

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/knowledge')
      const data = await res.json()
      if (res.ok) setDocs(data.documents ?? [])
      else toast.error(data.error ?? t('loadFailed'))
    } catch {
      toast.error(t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!accountId || loadedAccountIdRef.current === accountId) return
    loadedAccountIdRef.current = accountId
    void fetchDocs()
  }, [accountId, fetchDocs])

  const openNew = (mode: AddMode = 'text') => {
    setAddMode(mode)
    setEditing('new')
    setTitle('')
    setContent('')
    setUrl('')
    setFile(null)
  }

  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/knowledge/${id}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? t('openFailed'))
        return
      }
      setEditing(id)
      setAddMode('text')
      setTitle(data.title ?? '')
      setContent(data.content ?? '')
      setUrl(data.url ?? '')
    } catch {
      toast.error(t('openFailed'))
    }
  }

  const cancelEdit = () => {
    setEditing(null)
    setTitle('')
    setContent('')
    setUrl('')
    setFile(null)
  }

  const saveText = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t('titleContentRequired'))
      return
    }
    setSaving(true)
    try {
      const isNew = editing === 'new'
      const res = await fetch(
        isNew ? '/api/ai/knowledge' : `/api/ai/knowledge/${editing}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            source_type: 'text',
          }),
        },
      )
      const data = await res.json()
      if (res.ok) {
        if (data.warning) toast.warning(data.warning)
        else toast.success(isNew ? t('saveSuccessNew') : t('saveSuccessUpdate'))
        cancelEdit()
        await fetchDocs()
      } else {
        toast.error(data.error ?? t('saveFailed'))
      }
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const saveFile = async () => {
    if (!title.trim() || !file) {
      toast.error('Title and file are required')
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('file', file)
      formData.append('source_type', 'file')

      const res = await fetch('/api/ai/knowledge', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        if (data.warning) toast.warning(data.warning)
        else toast.success(t('saveSuccessNew'))
        cancelEdit()
        await fetchDocs()
      } else {
        toast.error(data.error ?? t('saveFailed'))
      }
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const saveUrl = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL are required')
      return
    }
    setSaving(true)
    try {
      const isNew = editing === 'new'
      const res = await fetch(
        isNew ? '/api/ai/knowledge' : `/api/ai/knowledge/${editing}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            url: url.trim(),
            source_type: 'url',
          }),
        },
      )
      const data = await res.json()
      if (res.ok) {
        if (data.warning) toast.warning(data.warning)
        else toast.success(isNew ? t('saveSuccessNew') : t('saveSuccessUpdate'))
        cancelEdit()
        await fetchDocs()
      } else {
        toast.error(data.error ?? t('saveFailed'))
      }
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const save = () => {
    if (addMode === 'file') return saveFile()
    if (addMode === 'url') return saveUrl()
    return saveText()
  }

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/knowledge/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('removeSuccess'))
        setDocs((d) => d.filter((x) => x.id !== id))
      } else {
        const data = await res.json()
        toast.error(data.error ?? t('removeFailed'))
      }
    } catch {
      toast.error(t('removeFailed'))
    }
  }

  const reindex = async () => {
    setReindexing(true)
    try {
      const res = await fetch('/api/ai/knowledge/reindex', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(t('reindexSuccess', { count: data.reindexed }))
      } else {
        toast.error(data.error ?? t('reindexFailed'))
      }
    } catch {
      toast.error(t('reindexFailed'))
    } finally {
      setReindexing(false)
    }
  }

  const viewChunks = async (doc: DocSummary) => {
    setSelectedDoc(doc)
    setChunksOpen(true)
    setChunksLoading(true)
    try {
      const res = await fetch(`/api/ai/knowledge/${doc.id}/chunks`)
      const data = await res.json()
      if (res.ok) {
        setChunks(data.chunks ?? [])
      } else {
        toast.error(data.error ?? 'Failed to load chunks')
        setChunks([])
      }
    } catch {
      toast.error('Failed to load chunks')
      setChunks([])
    } finally {
      setChunksLoading(false)
    }
  }

  const saveChunk = async () => {
    if (!editingChunk || !selectedDoc) return
    try {
      const res = await fetch(
        `/api/ai/knowledge/${selectedDoc.id}/chunks/${editingChunk.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editingChunk.content }),
        },
      )
      if (res.ok) {
        toast.success('Chunk updated')
        setChunks((prev) =>
          prev.map((c) => (c.id === editingChunk.id ? editingChunk : c)),
        )
        setEditingChunk(null)
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update chunk')
      }
    } catch {
      toast.error('Failed to update chunk')
    }
  }

  const sourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'file':
        return <FileText className="h-4 w-4" />
      case 'url':
        return <Globe className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  const sourceLabel = (doc: DocSummary) => {
    if (doc.source_type === 'file') return doc.file_type?.toUpperCase() || 'FILE'
    if (doc.source_type === 'url') return 'URL'
    return 'TEXT'
  }

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description', {
              searchType: hasEmbeddingsKey
                ? t('semanticSearchOn')
                : t('keywordSearchOn'),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}
            </div>
          ) : (
            <>
              {docs.length === 0 && editing === null && (
                <p className="text-sm text-muted-foreground">{t('noDocs')}</p>
              )}

              {docs.length > 0 && (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {docs.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {sourceIcon(doc.source_type)}
                        <span className="min-w-0 truncate text-sm text-foreground">
                          {doc.title}
                        </span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {sourceLabel(doc)}
                        </Badge>
                        {doc.usage_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px]"
                          >
                            <BarChart3 className="mr-1 h-3 w-3" />
                            {doc.usage_count}
                          </Badge>
                        )}
                        {doc.file_size && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatFileSize(doc.file_size)}
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <span className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => viewChunks(doc)}
                            title="View chunks"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => void openEdit(doc.id)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => void remove(doc.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {editing !== null ? (
                <div className="space-y-3 rounded-md border border-border p-3">
                  <Tabs
                    value={addMode}
                    onValueChange={(v) => setAddMode(v as AddMode)}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="text">
                        <BookOpen className="mr-1 h-3 w-3" /> Text
                      </TabsTrigger>
                      <TabsTrigger value="file">
                        <Upload className="mr-1 h-3 w-3" /> File
                      </TabsTrigger>
                      <TabsTrigger value="url">
                        <Link2 className="mr-1 h-3 w-3" /> URL
                      </TabsTrigger>
                    </TabsList>

                    <div className="space-y-3 pt-3">
                      <div className="space-y-2">
                        <Label htmlFor="kb-title">{t('editDocTitle')}</Label>
                        <Input
                          id="kb-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={t('editDocTitlePlaceholder')}
                          disabled={saving}
                        />
                      </div>

                      <TabsContent value="text" className="mt-0 space-y-2">
                        <Label htmlFor="kb-content">{t('editDocContent')}</Label>
                        <Textarea
                          id="kb-content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder={t('editDocContentPlaceholder')}
                          rows={8}
                          disabled={saving}
                        />
                      </TabsContent>

                      <TabsContent value="file" className="mt-0 space-y-2">
                        <Label>File (PDF, DOCX, TXT)</Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.txt,.md"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) {
                              setFile(f)
                              if (!title) setTitle(f.name)
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={saving}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {file ? file.name : 'Choose file'}
                        </Button>
                        {file && (
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="url" className="mt-0 space-y-2">
                        <Label htmlFor="kb-url">URL to import</Label>
                        <Input
                          id="kb-url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://example.com/page"
                          disabled={saving}
                        />
                      </TabsContent>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          {t('cancel')}
                        </Button>
                        <Button onClick={save} disabled={saving}>
                          {saving && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {t('saveDoc')}
                        </Button>
                      </div>
                    </div>
                  </Tabs>
                </div>
              ) : (
                canEdit && (
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openNew('text')}>
                        <Plus className="mr-2 h-4 w-4" /> Add Text
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openNew('file')}>
                        <Upload className="mr-2 h-4 w-4" /> Upload File
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openNew('url')}>
                        <Link2 className="mr-2 h-4 w-4" /> Import URL
                      </Button>
                    </div>
                    {hasEmbeddingsKey && docs.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={reindex}
                        disabled={reindexing}
                        title={t('reindexTooltip')}
                      >
                        {reindexing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {t('reindex')}
                      </Button>
                    )}
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={chunksOpen} onOpenChange={setChunksOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Chunks: {selectedDoc?.title}
            </DialogTitle>
            <DialogDescription>
              {chunks.length} chunks
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {chunksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chunks.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No chunks found
              </p>
            ) : (
              chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="outline">Chunk #{chunk.chunk_index}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingChunk(chunk)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {chunk.content}
                  </p>
                  {editingChunk?.id === chunk.id && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        value={editingChunk.content}
                        onChange={(e) =>
                          setEditingChunk({ ...editingChunk, content: e.target.value })
                        }
                        rows={4}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingChunk(null)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveChunk}>
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
