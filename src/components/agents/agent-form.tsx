'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Save,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AI_PROVIDER_DEFAULT_MODEL } from '@/lib/ai/defaults'
import type { Agent, AiProvider, TonePreset, AccountMember } from '@/types'
import { fetchAccountMembers, memberLabel } from '@/lib/account/members'
import { useTranslations } from 'next-intl'

const MASKED_KEY = '••••••••••••••••'
const HANDOFF_QUEUE = '__queue__'

const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
}

const KEY_PLACEHOLDER: Record<AiProvider, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
}

const TONE_PRESETS: { value: TonePreset; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Amigable' },
  { value: 'professional', label: 'Profesional' },
  { value: 'empathetic', label: 'Empático' },
  { value: 'technical', label: 'Técnico' },
]

interface AgentFormProps {
  agent: Agent | null
  onClose: () => void
  canEdit: boolean
}

export function AgentForm({ agent, onClose, canEdit }: AgentFormProps) {
  const t = useTranslations('Agents')

  const isEditing = Boolean(agent)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [provider, setProvider] = useState<AiProvider>('openai')
  const [model, setModel] = useState(AI_PROVIDER_DEFAULT_MODEL.openai)
  const [apiKey, setApiKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [embeddingsKey, setEmbeddingsKey] = useState('')
  const [embeddingsKeyEdited, setEmbeddingsKeyEdited] = useState(false)
  const [hasStoredEmbeddingsKey, setHasStoredEmbeddingsKey] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [topP, setTopP] = useState(1.0)
  const [frequencyPenalty, setFrequencyPenalty] = useState(0)
  const [presencePenalty, setPresencePenalty] = useState(0)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [tonePreset, setTonePreset] = useState<string>('')
  const [customToneInstructions, setCustomToneInstructions] = useState('')
  const [language, setLanguage] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false)
  const [maxPerConversation, setMaxPerConversation] = useState(3)
  const [handoffAgentId, setHandoffAgentId] = useState('')
  const [members, setMembers] = useState<AccountMember[]>([])

  const loadedAgentIdRef = useRef<string | null>(null)

  useEffect(() => {
    void fetchAccountMembers().then(setMembers)
  }, [])

  useEffect(() => {
    if (agent && loadedAgentIdRef.current !== agent.id) {
      loadedAgentIdRef.current = agent.id
      setLoading(true)
      fetch(`/api/agents/${agent.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.agent) {
            const a = data.agent
            setName(a.name)
            setDescription(a.description || '')
            setProvider(a.provider)
            setModel(a.model)
            setHasStoredKey(true)
            setApiKey(MASKED_KEY)
            setSystemPrompt(a.system_prompt || '')
            setTemperature(a.temperature)
            setTopP(a.top_p)
            setFrequencyPenalty(a.frequency_penalty)
            setPresencePenalty(a.presence_penalty)
            setMaxTokens(a.max_tokens)
            setTonePreset(a.tone_preset || '')
            setCustomToneInstructions(a.custom_tone_instructions || '')
            setLanguage(a.language || '')
            setIsActive(a.is_active)
            setAutoReplyEnabled(a.auto_reply_enabled)
            setMaxPerConversation(a.auto_reply_max_per_conversation)
            setHandoffAgentId(a.handoff_agent_id || '')
            setHasStoredEmbeddingsKey(Boolean(a.has_embeddings_key))
            setEmbeddingsKey(a.has_embeddings_key ? MASKED_KEY : '')
          }
        })
        .catch(() => toast.error(t('loadFailed')))
        .finally(() => setLoading(false))
    }
  }, [agent, t])

  const handleProviderChange = (next: AiProvider) => {
    setProvider(next)
    const isDefaultModel =
      model === AI_PROVIDER_DEFAULT_MODEL.openai ||
      model === AI_PROVIDER_DEFAULT_MODEL.anthropic ||
      model.trim() === ''
    if (isDefaultModel) setModel(AI_PROVIDER_DEFAULT_MODEL[next])
  }

  const keyPayload = () => (keyEdited ? apiKey.trim() : undefined)
  const embeddingsKeyPayload = () =>
    embeddingsKeyEdited ? embeddingsKey.trim() || null : undefined

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model: model.trim(),
          api_key: keyPayload(),
        }),
      })
      const data = await res.json()
      if (res.ok) toast.success(t('testSuccess'))
      else toast.error(data.error || t('testRejected'))
    } catch {
      toast.error(t('testNetworkError'))
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('missingName'))
      return
    }
    if (!model.trim()) {
      toast.error(t('missingModel'))
      return
    }
    if (!isEditing && !keyEdited) {
      toast.error(t('missingApiKey'))
      return
    }

    setSaving(true)
    try {
      const url = isEditing ? `/api/agents/${agent!.id}` : '/api/agents'
      const method = isEditing ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        provider,
        model: model.trim(),
        system_prompt: systemPrompt.trim() || null,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        max_tokens: maxTokens,
        tone_preset: tonePreset || null,
        custom_tone_instructions: customToneInstructions.trim() || null,
        language: language || null,
        is_active: isActive,
        auto_reply_enabled: autoReplyEnabled,
        auto_reply_max_per_conversation: maxPerConversation,
        handoff_agent_id: handoffAgentId || null,
      }

      if (keyPayload() !== undefined) {
        body.api_key = keyPayload()
      }
      if (embeddingsKeyPayload() !== undefined) {
        body.embeddings_api_key = embeddingsKeyPayload()
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(isEditing ? t('updateSuccess') : t('createSuccess'))
        onClose()
      } else {
        toast.error(data.error || t('saveFailed'))
      }
    } catch {
      toast.error(t('saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loading')}
      </div>
    )
  }

  const disabled = !canEdit || saving

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <h2 className="text-xl font-semibold">
          {isEditing ? t('editAgent') : t('createAgent')}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            {t('basicInfo')}
          </CardTitle>
          <CardDescription>{t('basicInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">{t('name')}</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-description">{t('description')}</Label>
            <Textarea
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={2}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('providerAndKey')}</CardTitle>
          <CardDescription>{t('encryptionNotice')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('provider')}</Label>
              <Select
                value={provider}
                onValueChange={(v) => handleProviderChange(v as AiProvider)}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">{PROVIDER_LABEL.openai}</SelectItem>
                  <SelectItem value="anthropic">
                    {PROVIDER_LABEL.anthropic}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-model">{t('model')}</Label>
              <Input
                id="agent-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={AI_PROVIDER_DEFAULT_MODEL[provider]}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-key">{t('apiKey')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="agent-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setKeyEdited(true)
                  }}
                  onFocus={() => {
                    if (!keyEdited && hasStoredKey) {
                      setApiKey('')
                      setKeyEdited(true)
                    }
                  }}
                  placeholder={KEY_PLACEHOLDER[provider]}
                  disabled={disabled}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={disabled || testing}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {t('testKey')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-embeddings-key">
              {t('embeddingsKey')}{' '}
              <span className="font-normal text-muted-foreground">
                {t('optionalSemanticSearch')}
              </span>
            </Label>
            <Input
              id="agent-embeddings-key"
              type="password"
              value={embeddingsKey}
              onChange={(e) => {
                setEmbeddingsKey(e.target.value)
                setEmbeddingsKeyEdited(true)
              }}
              onFocus={() => {
                if (!embeddingsKeyEdited && hasStoredEmbeddingsKey) {
                  setEmbeddingsKey('')
                  setEmbeddingsKeyEdited(true)
                }
              }}
              placeholder="sk-... (OpenAI)"
              disabled={disabled}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('behaviour')}</CardTitle>
          <CardDescription>{t('behaviourDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-prompt">{t('businessContext')}</Label>
            <Textarea
              id="agent-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={t('promptPlaceholder')}
              rows={5}
              disabled={disabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agent-tone">{t('tonePreset')}</Label>
              <Select
                value={tonePreset || 'none'}
                onValueChange={(v) => setTonePreset(v === 'none' || !v ? '' : v)}
                disabled={disabled}
              >
                <SelectTrigger id="agent-tone">
                  <SelectValue placeholder={t('selectTone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('noTone')}</SelectItem>
                  {TONE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-language">{t('language')}</Label>
              <Select
                value={language || 'auto'}
                onValueChange={(v) => setLanguage(v === 'auto' || !v ? '' : v)}
                disabled={disabled}
              >
                <SelectTrigger id="agent-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t('autoDetect')}</SelectItem>
                  <SelectItem value="es">{t('spanish')}</SelectItem>
                  <SelectItem value="en">{t('english')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-custom-tone">{t('customToneInstructions')}</Label>
            <Textarea
              id="agent-custom-tone"
              value={customToneInstructions}
              onChange={(e) => setCustomToneInstructions(e.target.value)}
              placeholder={t('customTonePlaceholder')}
              rows={3}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('modelParameters')}</CardTitle>
          <CardDescription>{t('modelParametersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agent-temperature">
                {t('temperature')} ({temperature})
              </Label>
              <Input
                id="agent-temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-top-p">
                {t('topP')} ({topP})
              </Label>
              <Input
                id="agent-top-p"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={topP}
                onChange={(e) => setTopP(Number(e.target.value))}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-freq-penalty">
                {t('frequencyPenalty')} ({frequencyPenalty})
              </Label>
              <Input
                id="agent-freq-penalty"
                type="range"
                min={-2}
                max={2}
                step={0.1}
                value={frequencyPenalty}
                onChange={(e) => setFrequencyPenalty(Number(e.target.value))}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-presence-penalty">
                {t('presencePenalty')} ({presencePenalty})
              </Label>
              <Input
                id="agent-presence-penalty"
                type="range"
                min={-2}
                max={2}
                step={0.1}
                value={presencePenalty}
                onChange={(e) => setPresencePenalty(Number(e.target.value))}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-max-tokens">{t('maxTokens')}</Label>
            <Input
              id="agent-max-tokens"
              type="number"
              min={100}
              max={8192}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              disabled={disabled}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('autoReply')}</CardTitle>
          <CardDescription>{t('autoReplyDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('enableAssistant')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('enableAssistantDesc')}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t('autoReply')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('autoReplyDesc')}
              </p>
            </div>
            <Switch
              checked={autoReplyEnabled}
              onCheckedChange={setAutoReplyEnabled}
              disabled={disabled || !isActive}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="agent-max">{t('maxAutoReplies')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('maxAutoRepliesDesc')}
              </p>
            </div>
            <Input
              id="agent-max"
              type="number"
              min={1}
              max={20}
              value={maxPerConversation}
              onChange={(e) =>
                setMaxPerConversation(
                  Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                )
              }
              disabled={disabled || !autoReplyEnabled}
              className="w-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-handoff">{t('handoffTo')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('handoffToDesc')}
            </p>
            <Select
              value={handoffAgentId || HANDOFF_QUEUE}
              onValueChange={(v) =>
                setHandoffAgentId(!v || v === HANDOFF_QUEUE ? '' : v)
              }
              disabled={disabled || !autoReplyEnabled}
            >
              <SelectTrigger id="agent-handoff">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HANDOFF_QUEUE}>
                  {t('handoffQueue')}
                </SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {memberLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSave} disabled={disabled}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? t('saveChanges') : t('createAgent')}
        </Button>
      </div>
    </div>
  )
}
