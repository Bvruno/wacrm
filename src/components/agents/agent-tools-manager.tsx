'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Plus,
  Trash2,
  Wrench,
  Pencil,
  X,
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
import { useTranslations } from 'next-intl'

interface AgentTool {
  id: string
  name: string
  description: string
  parameters: Record<string, unknown>
  endpoint: string | null
  is_builtin: boolean
  created_at: string
}

interface AgentToolsManagerProps {
  agentId: string
  canEdit: boolean
}

export function AgentToolsManager({ agentId, canEdit }: AgentToolsManagerProps) {
  const [tools, setTools] = useState<AgentTool[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<AgentTool | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parametersJson, setParametersJson] = useState('{}')
  const [endpoint, setEndpoint] = useState('')
  const [saving, setSaving] = useState(false)
  const t = useTranslations('Agents')

  const fetchTools = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/tools`)
      const data = await res.json()
      if (res.ok) {
        setTools(data.tools || [])
      } else {
        toast.error(data.error || 'Failed to load tools')
      }
    } catch {
      toast.error('Failed to load tools')
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    void fetchTools()
  }, [fetchTools])

  const openNew = () => {
    setEditingTool(null)
    setName('')
    setDescription('')
    setParametersJson('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}')
    setEndpoint('')
    setDialogOpen(true)
  }

  const openEdit = (tool: AgentTool) => {
    setEditingTool(tool)
    setName(tool.name)
    setDescription(tool.description)
    setParametersJson(JSON.stringify(tool.parameters, null, 2))
    setEndpoint(tool.endpoint || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      toast.error('Name and description are required')
      return
    }

    let parsedParams: Record<string, unknown>
    try {
      parsedParams = JSON.parse(parametersJson)
    } catch {
      toast.error('Parameters must be valid JSON')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agentId}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          parameters: parsedParams,
          endpoint: endpoint.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Tool created')
        setDialogOpen(false)
        await fetchTools()
      } else {
        toast.error(data.error || 'Failed to create tool')
      }
    } catch {
      toast.error('Failed to create tool')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (toolId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}/tools/${toolId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Tool deleted')
        setTools((prev) => prev.filter((t) => t.id !== toolId))
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete tool')
      }
    } catch {
      toast.error('Failed to delete tool')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-primary" /> Tools
          </CardTitle>
          <CardDescription>
            Custom tools this agent can use to perform actions like looking up
            orders, checking inventory, or sending emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : (
            <>
              {tools.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No custom tools configured. Add tools to extend this
                  agent&apos;s capabilities.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tools.map((tool) => (
                    <li
                      key={tool.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {tool.name}
                          </span>
                          {tool.is_builtin && (
                            <Badge variant="secondary">Built-in</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {tool.description}
                        </p>
                        {tool.endpoint && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Endpoint: {tool.endpoint}
                          </p>
                        )}
                      </div>
                      {canEdit && !tool.is_builtin && (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(tool)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => handleDelete(tool.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={openNew}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Tool
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTool ? 'Edit Tool' : 'Add Tool'}
            </DialogTitle>
            <DialogDescription>
              Define a tool this agent can call to perform actions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">Name</Label>
              <Input
                id="tool-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. check_order_status"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-description">Description</Label>
              <Textarea
                id="tool-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this tool does and when the agent should use it..."
                rows={3}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-parameters">
                Parameters (JSON Schema)
              </Label>
              <Textarea
                id="tool-parameters"
                value={parametersJson}
                onChange={(e) => setParametersJson(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Define the parameters the model should provide when calling this
                tool. Use JSON Schema format.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-endpoint">
                Endpoint URL{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="tool-endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.example.com/orders"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                If set, the tool will call this URL with the parameters.
                Leave empty for built-in tools.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTool ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
