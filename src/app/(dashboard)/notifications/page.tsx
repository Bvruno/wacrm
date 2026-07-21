"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@/types";
import {
  Bell,
  CheckCheck,
  Loader2,
  UserPlus,
  X,
  Trash2,
  Search,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const PAGE_SIZE = 30;

const TYPE_ICON: Record<Notification["type"], typeof Bell> = {
  conversation_assigned: UserPlus,
};

type FilterTab = "all" | "unread" | "read";

function updateFavicon(count: number) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, 32, 32);
    if (count > 0) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(26, 6, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(Math.min(count, 99)), 26, 6);
    }
    link.href = canvas.toDataURL();
  };
  img.src = "/codixia-icon.svg";
}

function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {
    // Audio not available — silently skip
  }
}

export default function NotificationsPage() {
  const t = useTranslations("NotificationsPage");
  const router = useRouter();
  const { accountId } = useAuth();
  const supabaseRef = useRef(createClient());

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearingRead, setClearingRead] = useState(false);

  const prevCountRef = useRef(0);

  const buildQuery = useCallback(
    (supabase: ReturnType<typeof createClient>) => {
      let q = supabase
        .from("notifications")
        .select("*")
        .eq("account_id", accountId!)
        .order("created_at", { ascending: false });

      if (filterTab === "unread") q = q.is("read_at", null);
      else if (filterTab === "read") q = q.not("read_at", "is", null);

      if (searchQuery) {
        q = q.or(
          `title.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%`,
        );
      }

      return q;
    },
    [accountId, filterTab, searchQuery],
  );

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    const supabase = supabaseRef.current;
    const q = buildQuery(supabase).limit(PAGE_SIZE);
    const { data, error: fetchErr } = await q;
    if (fetchErr) {
      setError(fetchErr.message);
      setLoading(false);
      return;
    }
    const items = (data ?? []) as Notification[];
    setNotifications(items);
    setHasMore(items.length >= PAGE_SIZE);
    setLoading(false);
    prevCountRef.current = items.filter((n) => !n.read_at).length;
  }, [accountId, buildQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!accountId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const last = notifications[notifications.length - 1];
    if (!last) {
      setLoadingMore(false);
      return;
    }
    const supabase = supabaseRef.current;
    const q = buildQuery(supabase).lt("created_at", last.created_at).limit(PAGE_SIZE);
    const { data, error: fetchErr } = await q;
    if (fetchErr) {
      toast.error(fetchErr.message);
      setLoadingMore(false);
      return;
    }
    const items = (data ?? []) as Notification[];
    setNotifications((prev) => [...prev, ...items]);
    setHasMore(items.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [accountId, buildQuery, loadingMore, hasMore, notifications]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Notification;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === row.id)) return prev;
              return [row, ...prev];
            });
            if (document.hidden) playNotificationSound();
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Notification;
            setNotifications((prev) =>
              prev?.map((n) =>
                n.id === row.id ? { ...n, ...row } : n,
              ) ?? prev,
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<Notification>;
            setNotifications(
              (prev) => prev?.filter((n) => n.id !== oldRow.id) ?? prev,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId]);

  // Update favicon badge when unread count changes
  const unreadCount = notifications.filter((n) => !n.read_at).length;
  useEffect(() => {
    updateFavicon(unreadCount);
  }, [unreadCount]);

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id && !n.read_at
            ? { ...n, read_at: new Date().toISOString() }
            : n,
        ),
      );
      const supabase = supabaseRef.current;
      const { error: updateErr } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null);
      if (updateErr) {
        toast.error("Failed to mark notification as read");
        load();
      }
    },
    [load],
  );

  const handleClick = useCallback(
    (n: Notification) => {
      if (!n.read_at) markRead(n.id);
      if (n.conversation_id) {
        router.push(`/inbox?c=${n.conversation_id}`);
      }
    },
    [markRead, router],
  );

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((n) => !n.read_at)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    const now = new Date().toISOString();
    setNotifications(
      (prev) =>
        prev.map((n) => (n.read_at ? n : { ...n, read_at: now })) ?? prev,
    );
    const supabase = supabaseRef.current;
    const { error: updateErr } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null);
    setMarkingAll(false);
    if (updateErr) {
      toast.error("Failed to mark all as read");
      load();
    }
  }, [notifications, load]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const supabase = supabaseRef.current;
      const { error: delErr } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      setDeleting(null);
      if (delErr) {
        toast.error(delErr.message);
        load();
      }
    },
    [load],
  );

  const handleClearRead = useCallback(async () => {
    const readIds = notifications
      .filter((n) => n.read_at)
      .map((n) => n.id);
    if (readIds.length === 0) return;
    if (
      !confirm(t("clearReadConfirm", { count: readIds.length }))
    )
      return;
    setClearingRead(true);
    setNotifications((prev) => prev.filter((n) => !n.read_at));
    const supabase = supabaseRef.current;
    const { error: delErr } = await supabase
      .from("notifications")
      .delete()
      .in("id", readIds);
    setClearingRead(false);
    if (delErr) {
      toast.error(delErr.message);
      load();
    } else {
      toast.success(t("clearReadDone", { count: readIds.length }));
    }
  }, [notifications, load, t]);

  const readCount = notifications.filter((n) => n.read_at).length;
  const unreadIds = notifications
    .filter((n) => !n.read_at)
    .map((n) => n.id);

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {readCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={clearingRead}
              onClick={handleClearRead}
            >
              {clearingRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {t("clearRead")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={unreadIds.length === 0 || markingAll}
            onClick={markAllRead}
          >
            {markingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {t("markAllRead")}
          </Button>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["all", "unread", "read"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filterTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(
                tab === "all"
                  ? "filterAll"
                  : tab === "unread"
                    ? "filterUnread"
                    : "filterRead",
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("search")}
            className="bg-muted pl-9 text-foreground"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            {t("empty")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("emptyDesc")}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {notifications.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              const isUnread = !n.read_at;
              return (
                <li key={n.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                      isUnread
                        ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                        : "border-border bg-card hover:border-border/70",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                        isUnread ? "bg-primary/15" : "bg-muted",
                      )}
                      aria-hidden
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          isUnread
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm font-semibold",
                            isUnread
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {n.title}
                        </span>
                        {isUnread && (
                          <span
                            aria-label="Unread"
                            className="h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t("deleteConfirm"))) handleDelete(n.id);
                    }}
                    disabled={deleting === n.id}
                    className={cn(
                      "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100",
                      deleting === n.id && "pointer-events-none opacity-50",
                    )}
                    aria-label={t("delete")}
                  >
                    {deleting === n.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                {t("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
