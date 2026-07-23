'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Course } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RefreshCw, Plus, MoreHorizontal, Pencil, Trash2, Loader2, BookOpen, Link as LinkIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CourseForm } from '@/components/courses/course-form';
import { PaymentLinkDialog } from '@/components/courses/payment-link-dialog';

export default function CoursesPage() {
  const t = useTranslations('Courses');
  const supabase = createClient();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refetch = useCallback(() => {
    setLoading(true);
    supabase.from('courses').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        setCourses((data ?? []) as Course[]);
        setLoading(false);
      });
  }, [supabase]);

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);

  // Payment link dialog
  const [payLinkOpen, setPayLinkOpen] = useState(false);
  const [payLinkCourse, setPayLinkCourse] = useState<Course | null>(null);

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/courses/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Error al sincronizar');
      } else {
        toast.success(json.message || 'Cursos sincronizados');
        refetch();
      }
    } catch {
      toast.error('Error de conexión al sincronizar');
    }
    setSyncing(false);
  }

  function openAddForm() {
    setEditCourse(null);
    setFormOpen(true);
  }

  function openEditForm(course: Course) {
    setEditCourse(course);
    setFormOpen(true);
  }

  function openPayLink(course: Course) {
    setPayLinkCourse(course);
    setPayLinkOpen(true);
  }

  function confirmDelete(course: Course) {
    setDeleteTarget(course);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('courses').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error(t('deleteError'));
    } else {
      toast.success(t('deleted'));
      refetch();
    }
    setDeleting(false);
    setDeleteOpen(false);
    setDeleteTarget(null);
  }

  function formatPrice(cents: number | undefined | null) {
    if (cents == null) return '-';
    return `S/ ${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {t('sync')}
          </Button>
          <Button onClick={openAddForm} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="size-4" />
            {t('addCourse')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">{t('table.code')}</TableHead>
              <TableHead className="text-muted-foreground">{t('table.title')}</TableHead>
              <TableHead className="text-muted-foreground hidden md:table-cell">{t('table.hours')}</TableHead>
              <TableHead className="text-muted-foreground">{t('table.price')}</TableHead>
              <TableHead className="text-muted-foreground hidden sm:table-cell">{t('table.status')}</TableHead>
              <TableHead className="text-muted-foreground w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="size-6 animate-spin text-primary mx-auto" />
                </TableCell>
              </TableRow>
            ) : courses.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center py-12">
                  <BookOpen className="size-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('empty')}</p>
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id} className="border-border hover:bg-muted/50">
                  <TableCell className="text-muted-foreground text-xs font-mono">
                    {course.external_id ? `#${course.external_id}` : '-'}
                  </TableCell>
                  <TableCell className="text-foreground font-medium max-w-xs">
                    <div className="truncate">{course.title}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                    {course.hours || <span className="text-muted-foreground/50">-</span>}
                  </TableCell>
                  <TableCell className="text-foreground font-mono">{formatPrice(course.price_pen)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      course.is_active
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {course.is_active ? t('active') : t('inactive')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem
                          onClick={() => openPayLink(course)}
                          className="text-popover-foreground focus:bg-muted focus:text-foreground"
                        >
                          <LinkIcon className="size-4" />
                          {t('generateLink')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          onClick={() => openEditForm(course)}
                          className="text-popover-foreground focus:bg-muted focus:text-foreground"
                        >
                          <Pencil className="size-4" />
                          {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => confirmDelete(course)}
                        >
                          <Trash2 className="size-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CourseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editCourse}
        onSaved={refetch}
      />

      <PaymentLinkDialog
        open={payLinkOpen}
        onOpenChange={setPayLinkOpen}
        course={payLinkCourse}
        onGenerated={(link) => {
          navigator.clipboard.writeText(
            `${window.location.origin}/pay/${link.code}`
          );
          toast.success(t('linkCopied'));
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">{t('deleteTitle')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('deleteConfirm', { title: deleteTarget?.title || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="border-border text-muted-foreground hover:bg-muted">
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
