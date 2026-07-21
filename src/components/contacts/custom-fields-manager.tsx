'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { CustomField } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GripVertical,
  Loader2,
  Plus,
  PlusCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface CustomFieldsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog wrapper around {@link CustomFieldsPanel}, used on the Contacts page.
 * The same panel is rendered inline under Settings → Custom Fields, so the
 * editing UI lives in one place. Radix unmounts the dialog content on close,
 * so the panel remounts (and refetches) on each open.
 */
export function CustomFieldsManager({
  open,
  onOpenChange,
}: CustomFieldsManagerProps) {
  const t = useTranslations('Contacts.customFields');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">{t('title')}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('desc')}
          </DialogDescription>
        </DialogHeader>
        <CustomFieldsPanel />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create / rename / delete account-wide custom contact field definitions.
 * Per-contact values are edited elsewhere (contact detail → Custom Fields);
 * this only manages the field catalogue. Admin+ gated by the caller — the
 * `custom_fields` RLS also rejects non-admin writes as defense in depth.
 */
const FIELD_TYPES = [
  'text',
  'number',
  'date',
  'boolean',
  'email',
  'phone',
  'url',
  'select',
] as const;

export function CustomFieldsPanel() {
  const t = useTranslations('Contacts.customFields');
  const supabase = createClient();
  const { user, accountId } = useAuth();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<string>('text');
  const [newOptions, setNewOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Usage counters: field_id → contact count
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const filteredFields = useMemo(
    () =>
      fields.filter((f) =>
        f.field_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [fields, search],
  );

  async function handleReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredFields.findIndex((f) => f.id === active.id);
    const newIndex = filteredFields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredFields, oldIndex, newIndex);

    // Map back to the full fields list by updating sort_order
    setFields((prev) => {
      const next = [...prev];
      for (let i = 0; i < reordered.length; i++) {
        const idx = next.findIndex((f) => f.id === reordered[i].id);
        if (idx !== -1) next[idx] = { ...next[idx], sort_order: i };
      }
      return next;
    });

    // Persist to DB — batch update with sort_order = position index
    const updates = reordered.map((f, i) => ({
      id: f.id,
      sort_order: i,
    }));
    for (const u of updates) {
      await supabase.from('custom_fields').update({ sort_order: u.sort_order }).eq('id', u.id);
    }
  }

  const fetchFields = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const { data } = await supabase
      .from('custom_fields')
      .select('*')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('field_name', { ascending: true });
    const fields = (data as CustomField[] | null) ?? [];
    setFields(fields);

    // Fetch per-field usage counts
    if (fields.length > 0) {
      const ids = fields.map((f) => f.id);
      const { data: counts } = await supabase
        .from('contact_custom_values')
        .select('custom_field_id')
        .in('custom_field_id', ids);
      const map: Record<string, number> = {};
      for (const row of counts ?? []) {
        map[row.custom_field_id] = (map[row.custom_field_id] ?? 0) + 1;
      }
      setUsageCounts(map);
    } else {
      setUsageCounts({});
    }

    setLoading(false);
  }, [supabase, accountId]);

  useEffect(() => {
    if (accountId) {
      fetchFields();
    }
  }, [accountId, fetchFields]);

  /** Case-insensitive name clash within the loaded list. */
  function isDuplicate(name: string, exceptId?: string): boolean {
    const lower = name.toLowerCase();
    return fields.some(
      (f) => f.id !== exceptId && f.field_name.toLowerCase() === lower
    );
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    if (!accountId || !user) {
      toast.error(t('toastNoAccount'));
      return;
    }
    if (isDuplicate(name)) {
      toast.error(t('toastDuplicate', { name }));
      return;
    }

    const fieldOptions =
      newType === 'select' && newOptions.length > 0
        ? { options: newOptions }
        : null;

    const nextOrder = fields.length;

    setCreating(true);
    const { error, data } = await supabase
      .from('custom_fields')
      .insert({
        field_name: name,
        field_type: newType,
        field_options: fieldOptions,
        sort_order: nextOrder,
        user_id: user.id,
        account_id: accountId,
      })
      .select('id')
      .maybeSingle();
    setCreating(false);

    if (error) {
      toast.error(t('toastCreateFailed'));
      return;
    }
    toast.success(t('toastCreated', { name }));
    setNewName('');
    setNewType('text');
    setNewOptions([]);
    setNewOptionInput('');
    if (data?.id) setLastAddedId(data.id);
    await fetchFields();
  }

  /** Returns true on success so the row can keep the new name, false so it
   *  reverts to the previous one. No-ops (blank / unchanged) count as success. */
  async function handleRename(
    field: CustomField,
    nextName: string
  ): Promise<boolean> {
    const name = nextName.trim();
    if (!name || name === field.field_name) return true;
    if (isDuplicate(name, field.id)) {
      toast.error(t('toastDuplicate', { name }));
      return false;
    }
    setBusyId(field.id);
    const { error } = await supabase
      .from('custom_fields')
      .update({ field_name: name })
      .eq('id', field.id);
    setBusyId(null);
    if (error) {
      toast.error(t('toastRenameFailed'));
      return false;
    }
    await fetchFields();
    return true;
  }

  function confirmDelete(field: CustomField) {
    setFieldToDelete(field);
    setDeleteDialogOpen(true);
  }

  async function executeDelete() {
    if (!fieldToDelete) return;
    setDeleting(true);
    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', fieldToDelete.id);
    setDeleting(false);
    if (error) {
      toast.error(t('toastDeleteFailed'));
      return;
    }
    toast.success(t('toastDeleted', { name: fieldToDelete.field_name }));
    setDeleteDialogOpen(false);
    setFieldToDelete(null);
    await fetchFields();
  }

  return (
    <div className="space-y-4">
      {/* Create */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newType !== 'select') {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder={t('fieldName')}
            className="bg-muted text-foreground"
          />
          <Select value={newType} onValueChange={(v) => { if (v) setNewType(v); }}>
            <SelectTrigger className="w-[130px] shrink-0 bg-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`fieldTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t('addField')}
          </Button>
        </div>
        {newType === 'select' && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/50 p-2">
            {newOptions.map((opt) => (
              <span
                key={opt}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {opt}
                <button
                  type="button"
                  onClick={() => setNewOptions((prev) => prev.filter((o) => o !== opt))}
                  aria-label={t('removeOption', { option: opt })}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = newOptionInput.trim();
                    if (val && !newOptions.includes(val)) {
                      setNewOptions((prev) => [...prev, val]);
                      setNewOptionInput('');
                    }
                  }
                }}
                placeholder={t('optionPlaceholder')}
                className="h-7 w-28 bg-background text-xs"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!newOptionInput.trim()}
                onClick={() => {
                  const val = newOptionInput.trim();
                  if (val && !newOptions.includes(val)) {
                    setNewOptions((prev) => [...prev, val]);
                    setNewOptionInput('');
                  }
                }}
              >
                <PlusCircle className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      {fields.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="bg-muted pl-8 text-foreground"
          />
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto rounded-md border border-border">
        {loading ? (
          <div className="space-y-1 p-3">
            <div className="h-8 animate-pulse rounded-md bg-muted" />
            <div className="h-8 animate-pulse rounded-md bg-muted" />
            <div className="h-8 animate-pulse rounded-md bg-muted" />
          </div>
        ) : fields.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : filteredFields.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('noResults')}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleReorder}
          >
            <SortableContext
              items={filteredFields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-border">
                {filteredFields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    busy={busyId === field.id}
                    usageCount={usageCounts[field.id] ?? 0}
                    highlighted={field.id === lastAddedId}
                    onRename={handleRename}
                    onDelete={confirmDelete}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {fieldToDelete ? t('deleteConfirm', { name: fieldToDelete.field_name }) : null}
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
              onClick={executeDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t('deleteTitle')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A single sortable, editable row. Controlled local state lets us commit on
 *  blur / Enter and cleanly revert to the last saved name when a rename fails. */
function FieldRow({
  field,
  busy,
  usageCount,
  highlighted,
  onRename,
  onDelete,
}: {
  field: CustomField;
  busy: boolean;
  usageCount: number;
  highlighted?: boolean;
  onRename: (field: CustomField, name: string) => Promise<boolean>;
  onDelete: (field: CustomField) => void;
}) {
  const t = useTranslations('Contacts.customFields');
  const [name, setName] = useState(field.field_name);
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  async function commit() {
    if (name.trim() === field.field_name) {
      setName(field.field_name); // normalise any whitespace-only edit
      return;
    }
    const ok = await onRename(field, name);
    if (!ok) setName(field.field_name);
  }

  const selectOptions = (
    field.field_type === 'select' && field.field_options
      ? (field.field_options as { options?: string[] }).options
      : undefined
  );

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 200ms ease',
      }}
      className={cn(
        'animate-in fade-in-50 slide-in-from-top-2 duration-200 group px-3 py-2',
        isDragging && 'z-10 opacity-50',
        highlighted && 'bg-primary/5',
      )}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
        <Input
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-label={t('renameAria', { name: field.field_name })}
          className="focus:border-primary h-8 border-transparent bg-transparent text-foreground hover:border-border"
        />
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t(`fieldTypes.${field.field_type}`)}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground/60">
          {usageCount}
        </span>
        {selectOptions && (
          <button
            type="button"
            onClick={() => setOptionsExpanded(!optionsExpanded)}
            className="shrink-0 text-[10px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            {selectOptions.length} opt{selectOptions.length !== 1 ? 's' : ''}
          </button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          onClick={() => onDelete(field)}
          title={t('deleteTitle')}
          className="shrink-0 text-muted-foreground hover:text-red-400"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      </div>
      {optionsExpanded && selectOptions && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-2">
          {selectOptions.map((opt) => (
            <span
              key={opt}
              className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {opt}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
