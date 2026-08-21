'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Conversation } from '@/types';

/**
 * Count of conversations with at least one unread inbound message for
 * the current user. Used by the sidebar and the mobile bottom nav to
 * surface a green dot on the Inbox entry.
 *
 * Lives on its own realtime channel (distinct from the inbox page's
 * "inbox-realtime") so both can coexist without sharing state.
 *
 * Module-level singleton: several components read the same total, but
 * Supabase forbids adding `postgres_changes` callbacks to a channel
 * that is already subscribed. Only the first consumer starts the
 * channel; everyone else attaches to the shared listener set below.
 */
const listeners = new Set<(total: number) => void>();

let channelStarted = false;
let total = 0;
let counts = new Map<string, number>();

function emit() {
  let sum = 0;
  for (const n of counts.values()) if (n > 0) sum += 1;
  total = sum;
  for (const listener of listeners) listener(total);
}

function ensureChannelStarted() {
  if (channelStarted) return;
  channelStarted = true;
  const supabase = createClient();

  // Initial load. RLS scopes this to the signed-in user automatically —
  // no explicit user_id filter needed here.
  (async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, unread_count');
    if (error || !data) return;

    counts = new Map<string, number>();
    for (const row of data as { id: string; unread_count: number }[]) {
      counts.set(row.id, row.unread_count ?? 0);
    }
    emit();
  })();

  supabase
    .channel('total-unread-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Partial<Conversation>;
          if (oldRow.id) counts.delete(oldRow.id);
        } else {
          const row = payload.new as Conversation;
          counts.set(row.id, row.unread_count ?? 0);
        }
        emit();
      }
    )
    .subscribe();
}

export function useTotalUnread(): number {
  const [state, setState] = useState(total);

  useEffect(() => {
    ensureChannelStarted();
    const listener = (next: number) => setState(next);
    listeners.add(listener);
    listener(total);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
