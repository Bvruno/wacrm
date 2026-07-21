'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Crown,
  History,
  Loader2,
  Mail,
  MailX,
  Plus,
  Search,
  Send,
  Trash2,
  UsersRound,
} from 'lucide-react';

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { RequireRole } from '@/components/auth/require-role';
import { useAuth } from '@/hooks/use-auth';
import { usePresence } from '@/hooks/use-presence';
import type { AccountRole } from '@/lib/auth/roles';
import { presenceLabel, summarize } from '@/lib/presence';
import {
  PRESENCE_DOT_CLASS,
  PresenceDot,
} from '@/components/presence/presence-dot';
import { InviteMemberDialog } from './invite-member-dialog';
import { SettingsPanelHead } from './settings-panel-head';
import { ROLE_META } from './role-meta';
import { cn } from '@/lib/utils';

interface Member {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: AccountRole;
  joined_at: string;
}

interface Invitation {
  id: string;
  role: 'admin' | 'agent' | 'viewer';
  label: string | null;
  created_at: string;
  expires_at: string;
}

interface ActivityEvent {
  id: string;
  type: 'role_change' | 'join' | 'remove';
  memberName: string;
  detail: string;
  timestamp: number;
}

const EDITABLE_ROLES: { value: AccountRole }[] = [
  { value: 'admin' },
  { value: 'agent' },
  { value: 'viewer' },
];

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-pink-500',
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type SortKey = 'name' | 'role' | 'joined';
type SortDir = 'asc' | 'desc';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function fmtLastActive(iso: string | null, t: (key: string, values?: Record<string, string | number>) => string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days === 0) return t('lastActiveToday', { time: fmtTime(iso) });
  if (days === 1) return t('lastActiveYesterday');
  return t('lastActiveLongAgo', { days });
}

function fmtExpiresIn(iso: string, t: (key: string, values?: Record<string, string | number>) => string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t('expired');
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return t('expiresInDays', { days });
  const hours = Math.max(1, Math.floor(ms / (60 * 60 * 1000)));
  return t('expiresInHours', { hours });
}

function cmpStr(a: string, b: string): number {
  return a.localeCompare(b);
}

function roleRank(r: AccountRole): number {
  return { owner: 4, admin: 3, agent: 2, viewer: 1 }[r] ?? 0;
}

export function MembersTab() {
  const t = useTranslations('Settings.members');
  const tRoles = useTranslations('Settings.roles');
  const { user, canManageMembers, accountRole } = useAuth();
  const { getPresence, getRow, now } = usePresence();

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [planData, setPlanData] = useState<{ maxAgents: number } | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<Member | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<string | null>(null);

  // Search + sort
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Role change confirmation
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    member: Member;
    nextRole: AccountRole;
  } | null>(null);

  // Transfer ownership
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string>('');
  const [transferring, setTransferring] = useState(false);

  // Activity log (in-memory for this session)
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);

  function addActivity(type: ActivityEvent['type'], memberName: string, detail: string) {
    setActivityLog((prev) => [
      { id: crypto.randomUUID(), type, memberName, detail, timestamp: Date.now() },
      ...prev,
    ]);
  }

  const loadEverything = useCallback(async () => {
    try {
      const [mres, ires, pres] = await Promise.all([
        fetch('/api/account/members', { cache: 'no-store' }),
        canManageMembers
          ? fetch('/api/account/invitations', { cache: 'no-store' })
          : Promise.resolve(null),
        canManageMembers
          ? fetch('/api/account/plan', { cache: 'no-store' })
          : Promise.resolve(null),
      ]);

      if (!mres.ok) {
        const payload = await mres.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to load members');
        return;
      }
      const mdata = (await mres.json()) as { members: Member[] };
      setMembers(mdata.members);

      if (ires) {
        if (!ires.ok) {
          const payload = await ires.json().catch(() => ({}));
          toast.error(payload.error || 'Failed to load invitations');
          return;
        }
        const idata = (await ires.json()) as { invitations: Invitation[] };
        setInvitations(idata.invitations);
      } else {
        setInvitations([]);
      }

      if (pres && pres.ok) {
        const pdata = await pres.json() as { limits: { maxAgents: number } };
        setPlanData(pdata.limits);
      }
    } catch (err) {
      console.error('[MembersTab] load error:', err);
      toast.error('Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, [canManageMembers]);

  useEffect(() => {
    void loadEverything();
  }, [loadEverything]);

  const filteredMembers = useMemo(() => {
    let result = [...members];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          (m.full_name || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q),
      );
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      if (sortKey === 'name') return cmpStr(a.full_name || '', b.full_name || '') * dir;
      if (sortKey === 'role') return (roleRank(a.role) - roleRank(b.role)) * dir;
      return (new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()) * dir;
    });
    return result;
  }, [members, search, sortKey, sortDir]);

  const seatsUsed = members.length;
  const seatsLimit = planData?.maxAgents ?? Infinity;
  const seatsRemaining = seatsLimit === Infinity ? Infinity : seatsLimit - seatsUsed;
  const isAtCapacity = seatsRemaining <= 0;

  async function handleRoleChange(member: Member, nextRole: AccountRole) {
    if (member.role === nextRole) return;
    // Open confirmation dialog instead of applying directly
    setPendingRoleChange({ member, nextRole });
  }

  async function executeRoleChange() {
    if (!pendingRoleChange) return;
    const { member, nextRole } = pendingRoleChange;
    const previousRole = member.role;
    setPendingMemberAction(member.user_id);
    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === member.user_id ? { ...m, role: nextRole } : m,
      ),
    );
    setPendingRoleChange(null);
    try {
      const res = await fetch(`/api/account/members/${member.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.user_id === member.user_id ? { ...m, role: previousRole } : m,
          ),
        );
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to update role');
        return;
      }
      toast.success(t('roleChangedToast', { name: member.full_name || t('unnamed'), role: tRoles(nextRole) }));
      addActivity('role_change', member.full_name || t('unnamed'), tRoles(nextRole));
    } catch (err) {
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === member.user_id ? { ...m, role: previousRole } : m,
        ),
      );
      console.error('[MembersTab] role change error:', err);
      toast.error('Could not reach the server');
    } finally {
      setPendingMemberAction(null);
    }
  }

  async function handleRemove() {
    if (!removingMember) return;
    setPendingMemberAction(removingMember.user_id);
    try {
      const res = await fetch(
        `/api/account/members/${removingMember.user_id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to remove member');
        return;
      }
      toast.success(t('removedToast', { name: removingMember.full_name || t('unnamed') }));
      setMembers((prev) =>
        prev.filter((m) => m.user_id !== removingMember.user_id),
      );
      addActivity('remove', removingMember.full_name || t('unnamed'), '');
      setRemovingMember(null);
    } catch (err) {
      console.error('[MembersTab] remove error:', err);
      toast.error('Could not reach the server');
    } finally {
      setPendingMemberAction(null);
    }
  }

  async function handleRevoke(invite: Invitation) {
    try {
      const res = await fetch(`/api/account/invitations/${invite.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to revoke invitation');
        return;
      }
      toast.success(t('revokedToast'));
      setInvitations((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      console.error('[MembersTab] revoke error:', err);
      toast.error('Could not reach the server');
    }
  }

  async function handleTransferOwnership() {
    if (!transferTarget) return;
    setTransferring(true);
    try {
      const res = await fetch('/api/account/transfer-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerUserId: transferTarget }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to transfer ownership');
        return;
      }
      const targetName = members.find((m) => m.user_id === transferTarget)?.full_name || t('unnamed');
      toast.success(t('transferredToast', { name: targetName }));
      setTransferDialogOpen(false);
      setTransferTarget('');
      await loadEverything();
    } catch (err) {
      console.error('[MembersTab] transfer error:', err);
      toast.error('Could not reach the server');
    } finally {
      setTransferring(false);
    }
  }

  function SkeletonRow() {
    return (
      <li className="flex animate-pulse items-center gap-4 px-4 py-3">
        <div className="size-9 rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
        <div className="h-6 w-20 rounded-md bg-muted" />
      </li>
    );
  }

  if (loading) {
    return (
      <section className="animate-in fade-in-50 space-y-6 duration-200">
        <SettingsPanelHead title={t('title')} description={t('description')} />
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </ul>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="animate-in fade-in-50 space-y-6 duration-200">
      <SettingsPanelHead
        title={t('title')}
        description={t('description')}
        action={
          <RequireRole min="admin">
            <Button onClick={() => setInviteOpen(true)} disabled={isAtCapacity}>
              <Plus className="size-4" />
              {t('inviteMember')}
            </Button>
          </RequireRole>
        }
      />

      {/* Plan seats indicator */}
      {planData && (
        <div className={cn(
          'rounded-md border px-3 py-2 text-xs',
          isAtCapacity
            ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
            : 'border-border bg-muted text-muted-foreground',
        )}>
          {isAtCapacity
            ? t('planSeatsFull', { limit: seatsLimit })
            : t('planSeats', { used: seatsUsed, limit: seatsLimit })}
        </div>
      )}

      {/* Presence summary */}
      {members.length > 0 &&
        (() => {
          const counts = summarize(members.map((m) => getPresence(m.user_id)));
          return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <PresenceDot status="online" />
                {counts.online} {t('online')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PresenceDot status="away" />
                {counts.away} {t('away')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PresenceDot status="offline" />
                {counts.offline} {t('offline')}
              </span>
              <span className="text-muted-foreground/70">
                · {t('memberCount', { count: members.length })}
              </span>
            </div>
          );
        })()}

      {/* Search + sort */}
      {members.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="bg-muted pl-8 text-foreground"
            />
          </div>
          <Select value={sortKey} onValueChange={(v) => v && setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[110px] bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{t('sortName')}</SelectItem>
              <SelectItem value="role">{t('sortRole')}</SelectItem>
              <SelectItem value="joined">{t('sortJoined')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="text-muted-foreground"
            aria-label={sortDir === 'asc' ? t('sortAsc') : t('sortDesc')}
          >
            {sortDir === 'asc' ? <ArrowDownAZ className="size-4" /> : <ArrowUpAZ className="size-4" />}
          </Button>
        </div>
      )}

      {/* Roster */}
      <Card>
        <CardContent className="p-0">
          {filteredMembers.length === 0 && members.length > 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('noResults')}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredMembers.map((member) => {
                const roleMeta = ROLE_META[member.role];
                const RoleIcon = roleMeta.icon;
                const isSelf = member.user_id === user?.id;
                const isOwnerRow = member.role === 'owner';
                const isBusy = pendingMemberAction === member.user_id;
                const presence = getPresence(member.user_id);
                const presenceRow = getRow(member.user_id);
                const presenceText = presenceLabel(
                  presence,
                  presenceRow?.last_seen_at ?? null,
                  now,
                );

                return (
                  <li
                    key={member.user_id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Avatar className="size-9 shrink-0">
                              {member.avatar_url ? (
                                <AvatarImage
                                  src={member.avatar_url}
                                  alt={member.full_name || 'Member'}
                                />
                              ) : null}
                              <AvatarFallback
                                className={cn(
                                  'text-sm font-medium text-white',
                                  avatarColor(member.user_id),
                                )}
                              >
                                {(member.full_name || member.email || 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                              <AvatarBadge
                                role="img"
                                aria-label={presenceText}
                                className={PRESENCE_DOT_CLASS[presence]}
                              />
                            </Avatar>
                          }
                        />
                        <TooltipContent>{presenceText}</TooltipContent>
                      </Tooltip>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {member.full_name || t('unnamed')}
                          </span>
                          {isSelf && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className="bg-muted text-muted-foreground border-border text-[10px] uppercase tracking-wide">
                                  {t('you')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('youTooltip', { role: tRoles(member.role) })}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {isOwnerRow && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Crown className="size-3.5 text-amber-400" />
                              </TooltipTrigger>
                              <TooltipContent>{t('ownerTooltip')}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {member.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Last active — desktop */}
                    <div className="hidden sm:block text-right text-xs text-muted-foreground/70">
                      {fmtLastActive(presenceRow?.last_seen_at ?? null, t)}
                    </div>

                    <div className="hidden sm:block text-right text-xs text-muted-foreground">
                      {t('joined', { date: fmtDate(member.joined_at) })}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      {canManageMembers && !isOwnerRow && !isSelf ? (
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            v && handleRoleChange(member, v as AccountRole)
                          }
                        >
                          <SelectTrigger
                            className="w-32 bg-muted border-border text-foreground"
                            disabled={isBusy}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EDITABLE_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {tRoles(r.value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                            roleMeta.className,
                          )}
                        >
                          <RoleIcon className="size-3.5" />
                          {tRoles(member.role)}
                        </span>
                      )}

                      {canManageMembers && !isOwnerRow && !isSelf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRemovingMember(member)}
                          disabled={isBusy}
                          className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/60 hover:text-red-200"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations — admin+ only */}
      <RequireRole min="admin">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <UsersRound className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              {t('pendingInvitations')}
            </h3>
            <Badge className="bg-muted text-muted-foreground border-border">
              {invitations.length}
            </Badge>
          </div>
          {invitations.length > 0 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              {t('inviteHint')}
            </p>
          ) : null}

          {invitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="size-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('noPendingTitle')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.rich('noPendingDesc', { bold: (chunks) => <strong>{chunks}</strong> })}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {invitations.map((inv) => {
                    const inviteRoleMeta = ROLE_META[inv.role];
                    const InviteRoleIcon = inviteRoleMeta.icon;
                    const isExpired = new Date(inv.expires_at).getTime() <= Date.now();
                    return (
                    <li
                      key={inv.id}
                      className={cn(
                        'flex items-center gap-4 px-4 py-3 transition-opacity',
                        isExpired && 'opacity-50',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-medium',
                            isExpired ? 'text-muted-foreground' : 'text-foreground',
                          )}>
                            {inv.label || t('untitledInvite')}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
                              inviteRoleMeta.className,
                            )}
                          >
                            <InviteRoleIcon className="size-3" />
                            {tRoles(inv.role)}
                          </span>
                          {isExpired && (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
                              {t('expired')}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t('created', { date: fmtDate(inv.created_at) })} · {fmtExpiresIn(inv.expires_at, t)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevoke(inv)}
                        className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/60 hover:text-red-200"
                      >
                        <MailX className="size-4" />
                        {t('revoke')}
                      </Button>
                    </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </RequireRole>

      {/* Transfer ownership — owner only */}
      {accountRole === 'owner' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  <Crown className="mr-1.5 inline size-4 text-amber-400" />
                  {t('transferTitle')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('transferDesc')}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setTransferDialogOpen(true)}
              >
                <Send className="size-4" />
                {t('transferBtn')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity log */}
      {activityLog.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t('activityTitle')}</h3>
          </div>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {activityLog.slice(0, 10).map((event) => (
                  <li key={event.id} className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
                    {event.type === 'role_change' && <Badge className="bg-primary/10 text-primary border-primary/20">{event.detail}</Badge>}
                    {event.type === 'join' && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Joined</Badge>}
                    {event.type === 'remove' && <Badge className="bg-red-500/10 text-red-400 border-red-500/30">Removed</Badge>}
                    <span>{event.memberName}</span>
                    <span className="ml-auto text-muted-foreground/60">
                      {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onCreated={() => {
          loadEverything();
          const newest = members[0];
          if (newest) addActivity('join', newest.full_name || t('unnamed'), '');
        }}
      />

      {/* Role change confirmation dialog */}
      <Dialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => { if (!open) setPendingRoleChange(null); }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-popover-foreground">
              <AlertTriangle className="size-4 text-amber-400" />
              {t('roleChangeTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {pendingRoleChange && t.rich('roleChangeDesc', {
                name: pendingRoleChange.member.full_name || t('unnamed'),
                from: tRoles(pendingRoleChange.member.role),
                to: tRoles(pendingRoleChange.nextRole),
                bold: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRoleChange(null)}>
              {t('cancel')}
            </Button>
            <Button onClick={executeRoleChange}>
              {t('removeBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation dialog */}
      <Dialog
        open={removingMember !== null}
        onOpenChange={(open) => { if (!open) setRemovingMember(null); }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-popover-foreground">
              <AlertTriangle className="size-4 text-amber-400" />
              {t('removeDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {removingMember && t.rich('removeDialogDesc', {
                name: removingMember.full_name || t('unnamed'),
                role: tRoles(removingMember.role),
                bold: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemovingMember(null)}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleRemove}
              disabled={!!pendingMemberAction}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {pendingMemberAction ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('removing')}
                </>
              ) : (
                t('removeBtn')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer ownership dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-popover border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">
              {t('transferConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {transferTarget && t.rich('transferConfirmDesc', {
                name: members.find((m) => m.user_id === transferTarget)?.full_name || t('unnamed'),
                bold: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('transferToLabel')}</Label>
              <Select value={transferTarget} onValueChange={(v) => v && setTransferTarget(v)}>
                <SelectTrigger className="w-full bg-muted border-border text-foreground">
                  <SelectValue placeholder={t('transferToLabel')} />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .filter((m) => m.user_id !== user?.id && m.role !== 'owner')
                    .map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.full_name || m.email || m.user_id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)} disabled={transferring}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleTransferOwnership}
              disabled={!transferTarget || transferring}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {transferring ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('transferring')}
                </>
              ) : (
                t('transferBtn')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
