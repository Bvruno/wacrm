'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Course } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onSaved: () => void;
}

function FormInner({ course, onSaved, onOpenChange }: {
  course: Course | null;
  onSaved: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Courses.form');
  const supabase = createClient();
  const isEdit = !!course;

  const [title, setTitle] = useState(course?.title ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [price, setPrice] = useState(course?.price_pen ? (course.price_pen / 100).toFixed(2) : '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error(t('titleRequired'));
      return;
    }
    const priceNum = price ? parseFloat(price) : 0;
    const hasPrice = priceNum > 0;

    setSaving(true);
    const priceCents = hasPrice ? Math.round(priceNum * 100) : null;

    if (isEdit && course) {
      const { error } = await supabase
        .from('courses')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price_pen: priceCents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', course.id);
      if (error) {
        toast.error(t('saveError'));
      } else {
        toast.success(t('updated'));
        onSaved();
        onOpenChange(false);
      }
    } else {
      const { error } = await supabase.from('courses').insert({
        title: title.trim(),
        description: description.trim() || null,
        price_pen: priceCents,
      });
      if (error) {
        toast.error(t('saveError'));
      } else {
        toast.success(t('created'));
        onSaved();
        onOpenChange(false);
      }
    }
    setSaving(false);
  }

  return (
    <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-popover-foreground">
          {isEdit ? t('editTitle') : t('addTitle')}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {isEdit ? t('editDesc') : t('addDesc')}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">{t('title')} *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            className="bg-muted border-border text-foreground h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">{t('description')}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descPlaceholder')}
            className="bg-muted border-border text-foreground text-sm resize-none min-h-[60px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">{t('price')} (S/) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0.50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="79.00"
            className="bg-muted border-border text-foreground h-9 text-sm font-mono"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-border text-muted-foreground hover:bg-muted"
        >
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? t('save') : t('create')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function CourseForm({ open, onOpenChange, course, onSaved }: CourseFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormInner
        key={course?.id ?? 'new'}
        course={course}
        onSaved={onSaved}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  );
}
