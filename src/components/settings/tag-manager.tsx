'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Loader2,
  Plus,
  Search,
  Tag as TagIcon,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Tag } from '@/types';

const PRESET_COLORS = [
  { name: 'red', value: '#ef4444' },
  { name: 'orange', value: '#f97316' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'emerald', value: '#10b981' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'violet', value: '#8b5cf6' },
  { name: 'pink', value: '#ec4899' },
];

/**
 * Tags card — colour-coded contact labels. Creation is an inline row
 * (name + colour swatch + Add); deletion goes through a confirmation
 * dialog since it detaches the tag from every contact.
 */
export function TagManager() {
  const t = useTranslations('Settings.tagsAndFields');
  const supabase = createClient();
  const { user, accountId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[3].value);

  // Inline edit state
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Usage counters: tag_id → contact count
  const [tagUsage, setTagUsage] = useState<Record<string, number>>({});

  // Search
  const [tagSearch, setTagSearch] = useState('');

  const filteredTags = useMemo(
    () =>
      tags.filter((t) =>
        t.name.toLowerCase().includes(tagSearch.toLowerCase()),
      ),
    [tags, tagSearch],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!accountId) {
      setLoading(false);
      return;
    }
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, accountId]);

  async function fetchTags() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const tags = data || [];
      setTags(tags);

      // Fetch per-tag usage counts
      if (tags.length > 0) {
        const ids = tags.map((t) => t.id);
        const { data: counts } = await supabase
          .from('contact_tags')
          .select('tag_id')
          .in('tag_id', ids);
        const map: Record<string, number> = {};
        for (const row of counts ?? []) {
          map[row.tag_id] = (map[row.tag_id] ?? 0) + 1;
        }
        setTagUsage(map);
      } else {
        setTagUsage({});
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      toast.error(t('failedToLoadTags'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTagName.trim()) {
      toast.error(t('nameRequired'));
      return;
    }

    try {
      setSaving(true);
      if (!user || !accountId) {
        toast.error(t('notAuthenticated'));
        return;
      }

      const { error } = await supabase.from('tags').insert({
        user_id: user.id,
        account_id: accountId,
        name: newTagName.trim(),
        color: selectedColor,
      });

      if (error) throw error;

      toast.success(t('tagCreated'));
      setNewTagName('');
      setSelectedColor(PRESET_COLORS[3].value);
      await fetchTags();
    } catch (err) {
      console.error('Create error:', err);
      toast.error(t('failedToCreateTag'));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(tag: Tag) {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  }

  function startEdit(tag: Tag) {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function cancelEdit() {
    setEditingTagId(null);
    setEditName('');
    setEditColor('');
  }

  async function handleUpdate() {
    if (!editingTagId || !editName.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from('tags')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', editingTagId);
    setSavingEdit(false);
    if (error) {
      console.error('Update error:', error);
      toast.error(t('failedToUpdateTag'));
      return;
    }
    toast.success(t('tagUpdated'));
    setTags((prev) =>
      prev.map((t) =>
        t.id === editingTagId
          ? { ...t, name: editName.trim(), color: editColor }
          : t,
      ),
    );
    cancelEdit();
  }

  async function handleDelete() {
    if (!tagToDelete) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagToDelete.id);

      if (error) throw error;

      toast.success(t('tagDeleted'));
      setTags((prev) => prev.filter((t) => t.id !== tagToDelete.id));
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(t('failedToDeleteTag'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <TagIcon className="size-4 text-primary" />
          {t('tagsTitle')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('tagsDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2 p-1">
            <div className="h-8 animate-pulse rounded-full bg-muted" />
            <div className="h-8 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-3/4 animate-pulse rounded-full bg-muted" />
          </div>
        ) : (
          <>
            {tags.length > 0 ? (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder={t('search')}
                    className="bg-muted pl-8 text-foreground"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                {filteredTags.map((tag) =>
                  editingTagId === tag.id ? (
                    <div
                      key={tag.id}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted p-2"
                    >
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleUpdate();
                          }
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        maxLength={40}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setEditColor(c.value)}
                            aria-label={t('useColor', {
                              color: t(
                                `colors.${c.name}` as Parameters<typeof t>[0],
                              ),
                            })}
                            aria-pressed={editColor === c.value}
                            className={cn(
                              'size-5 rounded-md transition-transform hover:scale-110',
                              editColor === c.value &&
                                'outline outline-2 outline-offset-2 outline-primary',
                            )}
                            style={{ backgroundColor: c.value }}
                          />
                        ))}
                      </div>
                      <Button
                        size="icon-sm"
                        onClick={handleUpdate}
                        disabled={savingEdit || !editName.trim()}
                      >
                        {savingEdit ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={cancelEdit}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <span
                      key={tag.id}
                      className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        border: `1px solid ${tag.color}40`,
                      }}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <button
                        type="button"
                        onClick={() => startEdit(tag)}
                        aria-label={t('editAria', { name: tag.name })}
                        className="hover:underline"
                      >
                        {tag.name}
                      </button>
                      <span className="ml-0.5 text-[10px] tabular-nums opacity-60">
                        {tagUsage[tag.id] ?? 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => confirmDelete(tag)}
                        aria-label={t('deleteAria', { name: tag.name })}
                        className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ),
                )}
              </div>
                {tags.length > 0 && filteredTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('noResults')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('noTags')}
              </p>
            )}

            {/* Inline create row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Input
                placeholder={t('placeholder')}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                disabled={saving}
                maxLength={40}
                className="min-w-[180px] flex-1"
              />
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    aria-label={t('useColor', { color: t(`colors.${color.name}` as Parameters<typeof t>[0]) })}
                    aria-pressed={selectedColor === color.value}
                    className={cn(
                      'size-6 rounded-md transition-transform hover:scale-110',
                      selectedColor === color.value &&
                        'outline outline-2 outline-offset-2 outline-primary',
                    )}
                    style={{ backgroundColor: color.value }}
                    title={t(`colors.${color.name}` as Parameters<typeof t>[0])}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreate}
                disabled={saving || !newTagName.trim()}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {t('addTag')}
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deleteTag')}</DialogTitle>
            <DialogDescription>
              {tagToDelete ? t('deleteConfirm', { name: tagToDelete.name }) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('deleting')}
                </>
              ) : (
                t('deleteTag')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
