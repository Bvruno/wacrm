import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';

interface DailyBucket {
  date: string;
  inbound: number;
  outboundFree: number;
  outboundTemplate: number;
  outboundBroadcast: number;
  costMeta: number;
  costAi: number;
  costTotal: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  cost: number;
}

interface AiCost {
  totalTokens: number;
  totalCalls: number;
  autoReplyTokens: number;
  draftTokens: number;
  estimatedCostUsd: number;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, accountId } = await getCurrentAccount();

    const { searchParams } = new URL(req.url);
    const days = Math.min(Number(searchParams.get('days') || 30), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    // 1. Get conversations with window timestamps
    const { data: conversationsData } = await supabase
      .from('conversations')
      .select('id, last_customer_message_at')
      .eq('account_id', accountId);

    const convWindowMap = new Map<string, string | null>();
    for (const c of conversationsData ?? []) {
      convWindowMap.set(c.id, c.last_customer_message_at);
    }

    const conversationIds = (conversationsData ?? []).map((c) => c.id);

    // 2. Get all messages in period
    let allMessages: Array<{
      id: string;
      conversation_id: string;
      sender_type: string;
      content_type: string;
      template_name?: string | null;
      created_at: string;
    }> = [];
    if (conversationIds.length > 0) {
      const { data: msgs } = await supabase
        .from('messages')
        .select(
          'id, conversation_id, sender_type, content_type, template_name, created_at'
        )
        .in('conversation_id', conversationIds)
        .gte('created_at', sinceIso);
      allMessages = msgs ?? [];
    }

    // 3. Get template categories
    const { data: templatesData } = await supabase
      .from('message_templates')
      .select('name, category')
      .eq('account_id', accountId);

    const templateCategories = new Map<string, string>();
    for (const t of templatesData ?? []) {
      templateCategories.set(t.name, (t.category || 'marketing').toLowerCase());
    }

    // 4. Get broadcasts
    const { data: broadcastsData } = await supabase
      .from('broadcasts')
      .select('id, template_name, created_at')
      .eq('account_id', accountId)
      .eq('status', 'sent')
      .gte('created_at', sinceIso);

    const broadcastIds = (broadcastsData ?? []).map((b) => b.id);

    // 5. Get broadcast recipients
    let broadcastRecipients: Array<{
      id: string;
      broadcast_id: string;
      status: string;
      created_at: string;
    }> = [];
    if (broadcastIds.length > 0) {
      const { data: brs } = await supabase
        .from('broadcast_recipients')
        .select('id, broadcast_id, status, created_at')
        .in('broadcast_id', broadcastIds);
      broadcastRecipients = brs ?? [];
    }

    // 6. Get AI usage
    const { data: aiUsageData } = await supabase
      .from('ai_usage_log')
      .select('mode, total_tokens, created_at')
      .eq('account_id', accountId)
      .gte('created_at', sinceIso);

    // 7. Get rates
    const { data: ratesData } = await supabase
      .from('meta_costs')
      .select('category, rate_per_conversation')
      .eq('account_id', accountId);

    const rates = new Map<string, number>();
    for (const r of ratesData ?? []) {
      rates.set(r.category, Number(r.rate_per_conversation) || 0);
    }

    // Process messages
    const dailyMap = new Map<string, DailyBucket>();
    let totalInbound = 0;
    let totalOutboundFree = 0;
    let totalOutboundTemplate = 0;
    let totalOutboundBroadcast = 0;
    let totalCostMeta = 0;
    const categoryCounts = new Map<string, number>();

    const getOrCreateBucket = (date: string): DailyBucket => {
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          inbound: 0,
          outboundFree: 0,
          outboundTemplate: 0,
          outboundBroadcast: 0,
          costMeta: 0,
          costAi: 0,
          costTotal: 0,
        });
      }
      return dailyMap.get(date)!;
    };

    for (const msg of allMessages) {
      const date = new Date(msg.created_at).toISOString().split('T')[0];
      const bucket = getOrCreateBucket(date);

      if (msg.sender_type === 'customer') {
        bucket.inbound++;
        totalInbound++;
        continue;
      }

      if (msg.content_type === 'template') {
        bucket.outboundTemplate++;
        totalOutboundTemplate++;

        const cat =
          templateCategories.get(msg.template_name || '') || 'marketing';
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

        const rate = rates.get(cat) || rates.get('marketing') || 0;
        bucket.costMeta += rate;
        totalCostMeta += rate;
      } else {
        const windowOpen = msg.conversation_id
          ? convWindowMap.get(msg.conversation_id)
          : null;
        const inWindow =
          windowOpen &&
          new Date(msg.created_at).getTime() - new Date(windowOpen).getTime() <
            24 * 60 * 60 * 1000;

        if (inWindow) {
          bucket.outboundFree++;
          totalOutboundFree++;
        } else {
          bucket.outboundTemplate++;
          totalOutboundTemplate++;
          const rate = rates.get('utility') || 0.0034;
          bucket.costMeta += rate;
          totalCostMeta += rate;
        }
      }
    }

    // Process broadcasts
    const broadcastMap = new Map((broadcastsData ?? []).map((b) => [b.id, b]));

    for (const br of broadcastRecipients) {
      const broadcast = broadcastMap.get(br.broadcast_id);
      if (!broadcast) continue;

      const date = new Date(br.created_at).toISOString().split('T')[0];
      const bucket = getOrCreateBucket(date);

      if (
        br.status === 'sent' ||
        br.status === 'delivered' ||
        br.status === 'read'
      ) {
        bucket.outboundBroadcast++;
        totalOutboundBroadcast++;

        const cat =
          templateCategories.get(broadcast.template_name || '') || 'marketing';
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

        const rate = rates.get(cat) || rates.get('marketing') || 0;
        bucket.costMeta += rate;
        totalCostMeta += rate;
      }
    }

    // Process AI usage
    const aiTokensByDay = new Map<string, number>();
    let totalAiTokens = 0;
    let totalAiCalls = 0;
    let autoReplyTokens = 0;
    let draftTokens = 0;

    for (const usage of aiUsageData ?? []) {
      const date = new Date(usage.created_at).toISOString().split('T')[0];
      const tokens = usage.total_tokens || 0;
      aiTokensByDay.set(date, (aiTokensByDay.get(date) || 0) + tokens);
      totalAiTokens += tokens;
      totalAiCalls++;

      if (usage.mode === 'auto_reply') autoReplyTokens += tokens;
      if (usage.mode === 'draft') draftTokens += tokens;
    }

    const aiCostRate = 0.0000003;
    let totalAiCost = 0;
    for (const [date, tokens] of aiTokensByDay) {
      const bucket = getOrCreateBucket(date);
      const cost = tokens * aiCostRate;
      bucket.costAi = cost;
      totalAiCost += cost;
    }

    // Fill costTotal
    for (const bucket of dailyMap.values()) {
      bucket.costTotal = bucket.costMeta + bucket.costAi;
    }

    const daily: DailyBucket[] = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const categoryBreakdown: CategoryBreakdown[] = Array.from(
      categoryCounts.entries()
    ).map(([category, count]) => ({
      category,
      count,
      cost: count * (rates.get(category) || rates.get('marketing') || 0),
    }));

    const aiCost: AiCost = {
      totalTokens: totalAiTokens,
      totalCalls: totalAiCalls,
      autoReplyTokens,
      draftTokens,
      estimatedCostUsd: totalAiCost,
    };

    const summary = {
      period: `Last ${days} days`,
      since: sinceIso,
      totalMessages: {
        inbound: totalInbound,
        outboundFree: totalOutboundFree,
        outboundTemplate: totalOutboundTemplate,
        outboundBroadcast: totalOutboundBroadcast,
        totalOutbound:
          totalOutboundFree + totalOutboundTemplate + totalOutboundBroadcast,
      },
      costs: {
        metaUsd: Math.round(totalCostMeta * 100) / 100,
        aiUsd: Math.round(totalAiCost * 100) / 100,
        totalUsd: Math.round((totalCostMeta + totalAiCost) * 100) / 100,
      },
      rates: Object.fromEntries(rates),
      freeServiceConversations: totalInbound,
      templateConversations: totalOutboundTemplate + totalOutboundBroadcast,
    };

    return NextResponse.json({ summary, daily, categoryBreakdown, aiCost });
  } catch (err) {
    return toErrorResponse(err);
  }
}
