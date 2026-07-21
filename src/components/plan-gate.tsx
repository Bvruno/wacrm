'use client'

import type { ReactNode } from 'react'
import { usePlan } from '@/hooks/use-plan'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, Rocket, Check, X, BarChart3, Users, MessageSquare } from 'lucide-react'

interface PlanGateProps {
  feature: 'has_broadcasts' | 'has_automations' | 'has_ai_assistant'
  children: ReactNode
}

const FEATURE_LABELS: Record<string, string> = {
  has_broadcasts: 'Broadcasts',
  has_automations: 'Automations',
  has_ai_assistant: 'Asistente IA',
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  has_broadcasts: 'Envía mensajes plantilla masivos a tus contactos con campañas programadas.',
  has_automations: 'Automatiza seguimientos, calificación de leads y flujos de trabajo recurrentes.',
  has_ai_assistant: 'Respuestas automáticas con IA, borradores inteligentes y búsqueda en base de conocimiento.',
}

const ALL_FEATURES: { key: string; label: string }[] = [
  { key: 'has_broadcasts', label: 'Broadcasts' },
  { key: 'has_automations', label: 'Automations' },
  { key: 'has_ai_assistant', label: 'Asistente IA' },
]

export function PlanGate({ feature, children }: PlanGateProps) {
  const { data, loading } = usePlan()

  if (loading && !data) return null

  const isAllowed = data?.limits?.[feature as keyof typeof data.limits] === true

  if (isAllowed) return <>{children}</>

  const featureName = FEATURE_LABELS[feature] ?? feature
  const planName = data?.plan?.name ?? 'Gratuito'
  const maxMessages = data?.limits?.maxMessagesPerDay ?? -1
  const maxAgents = data?.limits?.maxAgents ?? -1
  const messagesUsed = data?.usage?.messagesToday ?? 0
  const agentsUsed = data?.usage?.agents ?? 0
  const messagePercent = maxMessages === -1 ? 0 : Math.min((messagesUsed / maxMessages) * 100, 100)
  const agentPercent = maxAgents === -1 ? 0 : Math.min((agentsUsed / maxAgents) * 100, 100)

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Banner de upgrade */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-background p-6 md:p-8">
        <div className="absolute right-0 top-0 hidden h-full w-1/3 opacity-5 md:block">
          <Rocket className="h-full w-full" />
        </div>

        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Lock className="h-6 w-6 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-foreground md:text-2xl">
                {featureName} no está disponible en tu plan {planName.toLowerCase()}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Actualiza a Pro o Enterprise para desbloquear {featureName.toLowerCase()} y todas las funciones premium.
              </p>
            </div>
            <div className="hidden shrink-0 md:block">
              <Badge variant="outline" className="border-amber-500/30 text-amber-600">
                {planName}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Dos columnas: uso actual + comparativa de funciones */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Uso actual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Tu uso actual
            </CardTitle>
            <CardDescription>
              Ya estás usando {planName.toLowerCase()} — mira qué tan cerca estás de los límites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  Mensajes hoy
                </span>
                <span className="font-medium tabular-nums">
                  {messagesUsed}{maxMessages !== -1 ? ` / ${maxMessages}` : ''}
                </span>
              </div>
              {maxMessages !== -1 && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${messagePercent}%` }}
                  />
                </div>
              )}
              {maxMessages !== -1 && maxMessages - messagesUsed <= 20 && (
                <p className="text-xs text-amber-500">
                  Solo te quedan {maxMessages - messagesUsed} mensajes hoy — actualiza para obtener 1,000/día con Pro o ilimitados con Enterprise.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Agentes
                </span>
                <span className="font-medium tabular-nums">
                  {agentsUsed}{maxAgents !== -1 ? ` / ${maxAgents}` : ''}
                </span>
              </div>
              {maxAgents !== -1 && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${agentPercent}%` }}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Consejo:</span>{' '}
                Pro ($29/mes) te da 10 agentes, 1,000 mensajes/día, broadcasts, automations y asistente IA.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comparativa de funciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4 text-muted-foreground" />
              Lo que te estás perdiendo
            </CardTitle>
            <CardDescription>
              Actualiza para desbloquear estas funciones y hacer crecer tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0">
            {ALL_FEATURES.map((f) => {
              const enabled = data?.limits?.[f.key as keyof typeof data.limits] === true
              const isCurrent = f.key === feature
              return (
                <div
                  key={f.key}
                  className="flex items-start gap-3 border-b border-border py-3 last:border-0"
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      enabled ? 'bg-emerald-500/10 text-emerald-500' : isCurrent ? 'bg-amber-500/10 text-amber-500' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {enabled ? (
                      <Check className="h-3 w-3" />
                    ) : isCurrent ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {f.label}
                      {isCurrent && (
                        <Badge variant="outline" className="ml-2 border-amber-500/30 text-[10px] text-amber-600">
                          bloqueado
                        </Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {FEATURE_DESCRIPTIONS[f.key]}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          ¿Listo para desbloquear {featureName.toLowerCase()} y todas las funciones premium?
        </p>
        <div className="flex gap-3">
          <a href="/settings?tab=plan">
            <Button variant="default" size="lg">
              <Rocket className="mr-2 h-4 w-4" />
              Ver Planes
            </Button>
          </a>
          <a href="mailto:support@wacrm.com?subject=Plan%20Upgrade%20Request">
            <Button variant="outline" size="lg">
              Contactar Ventas
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
