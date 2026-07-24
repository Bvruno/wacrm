'use client';

import { useState } from 'react';
import { Bot, Sparkles, BarChart3, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AiPlayground } from '@/components/agents/ai-playground';
import { AiUsageCard } from '@/components/agents/ai-usage';
import { AgentList } from '@/components/agents/agent-list';
import { PlanGate } from '@/components/plan-gate';
import { useAuth } from '@/hooks/use-auth';
import { canEditSettings } from '@/lib/auth/roles';
import { useTranslations } from 'next-intl';

type Tab = 'agents' | 'playground' | 'usage';

function getInitialTab(): Tab {
  if (typeof window === 'undefined') return 'agents';
  const savedTab = localStorage.getItem('agents-tab') as Tab | null;
  if (savedTab && ['agents', 'playground', 'usage'].includes(savedTab)) {
    return savedTab;
  }
  return 'agents';
}

export default function AgentsPage() {
  const { accountRole } = useAuth();
  const canViewUsage = accountRole ? canEditSettings(accountRole) : false;
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const t = useTranslations('Agents');

  const handleTabChange = (v: string) => {
    const newTab = v as Tab;
    setTab(newTab);
    localStorage.setItem('agents-tab', newTab);
  };

  return (
    <PlanGate feature="has_ai_assistant">
      <div>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>

        <Tabs
          value={tab}
          onValueChange={handleTabChange}
          className="mt-6"
        >
          <TabsList>
            <TabsTrigger value="agents">
              <Users className="mr-1.5 h-4 w-4" /> {t('agents')}
            </TabsTrigger>
            <TabsTrigger value="playground">
              <Sparkles className="mr-1.5 h-4 w-4" /> {t('playground')}
            </TabsTrigger>
            {canViewUsage && (
              <TabsTrigger value="usage">
                <BarChart3 className="mr-1.5 h-4 w-4" /> {t('usage')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="agents" className="mt-4">
            <AgentList />
          </TabsContent>

          <TabsContent value="playground" className="mt-4">
            <AiPlayground />
          </TabsContent>

          {canViewUsage && (
            <TabsContent value="usage" className="mt-4">
              <AiUsageCard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </PlanGate>
  );
}
