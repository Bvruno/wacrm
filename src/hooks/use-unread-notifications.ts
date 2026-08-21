'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';

/**
 * Count of unread notifications for the current user. Used by the
 * sidebar to surface a badge on the Notifications nav entry.
 *
 * RLS on `notifications` already scopes every read to `auth.uid() =
 * user_id`, so no explicit filter is needed here — same pattern as
 * `useTotalUnread` for conversations.
 *
 * Module-level singleton: the sidebar and the notifications page can
 * both be mounted at once, but Supabase forbids adding callbacks to an
 * already-subscribed channel. Only the first consumer starts it.
 */
const listeners = new Set<(count: number) => void>();

let channelStarted = false;
let count = 0;

function emit() {
  for (const listener of listeners) listener(count);
}

function ensureChannelStarted() {
  if (channelStarted) return;
  channelStarted = true;
  const supabase = createClient();

  (async () => {
    // head:true skips fetching rows — we only need the `count`
    // supabase-js returns alongside the (empty) response body.
    const { count: unreadCount, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);
    if (error) return;
    count = unreadCount ?? 0;
    emit();
  })();

  supabase
    .channel('notifications-unread-count')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as Notification;
          if (!row.read_at) count += 1;
        } else if (payload.eventType === 'UPDATE') {
          // Updates here only ever set read_at (marking a notification
          // read). Derive purely from the new row so we don't rely on
          // payload.old columns, which require REPLICA IDENTITY FULL.
          const newRow = payload.new as Notification;
          if (newRow.read_at) count = Math.max(0, count - 1);
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Partial<Notification>;
          if (!oldRow.read_at) count = Math.max(0, count - 1);
        }
        emit();
      }
    )
    .subscribe();
}

export function useUnreadNotifications(): number {
  const [state, setState] = useState(count);

  useEffect(() => {
    ensureChannelStarted();
    const listener = (next: number) => setState(next);
    listeners.add(listener);
    listener(count);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}
