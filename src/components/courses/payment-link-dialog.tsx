'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Loader2, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PaymentLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onGenerated: (link: { code: string; url: string }) => void;
}

function PaymentLinkInner({
  course,
  onGenerated,
  onOpenChange,
}: {
  course: Course;
  onGenerated: (link: { code: string; url: string }) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Courses.paymentLink');

  const [amount, setAmount] = useState(course.price_pen ? (course.price_pen / 100).toFixed(2) : '');
  const [contactName, setContactName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{ code: string; url: string } | null>(null);

  async function handleGenerate() {
    const priceNum = parseFloat(amount);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error(t('invalidAmount'));
      return;
    }

    setGenerating(true);
    const res = await fetch('/api/payment-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: course.id,
        amount_pen: priceNum,
        contact_name: contactName.trim() || null,
      }),
    });
    const data = await res.json();
    setGenerating(false);

    if (!res.ok || !data?.code) {
      toast.error(t('generateError'));
      return;
    }

    const url = `${window.location.origin}/pay/${data.code}`;
    setGeneratedLink({ code: data.code, url });
    onGenerated({ code: data.code, url });
    toast.success(t('generated'));
  }

  async function copyLink() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink.url);
    toast.success(t('copied'));
  }

  return (
    <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-popover-foreground">{t('title')}</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {t('desc', { course: course.title })}
        </DialogDescription>
      </DialogHeader>

      {!generatedLink ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t('amount')} (S/)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-muted border-border text-foreground h-9 text-sm font-mono text-lg"
            />
            <p className="text-[10px] text-muted-foreground">{t('amountHint')}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t('contactName')}</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t('contactPlaceholder')}
              className="bg-muted border-border text-foreground h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">{t('contactHint')}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">{t('linkReady')}</p>
            <p className="text-sm font-mono text-foreground break-all bg-muted rounded-md px-3 py-2 border border-border">
              {generatedLink.url}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('sendToCustomer')}
            </p>
          </div>
        </div>
      )}

      <DialogFooter className="gap-2">
        {!generatedLink ? (
          <>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {generating && <Loader2 className="size-4 animate-spin" />}
              {t('generateBtn')}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => { setGeneratedLink(null); }}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('newLink')}
            </Button>
            <Button
              onClick={copyLink}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Copy className="size-4" />
              {t('copyLink')}
            </Button>
          </>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

export function PaymentLinkDialog({
  open,
  onOpenChange,
  course,
  onGenerated,
}: PaymentLinkDialogProps) {
  if (!course) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <PaymentLinkInner
        key={course.id}
        course={course}
        onGenerated={onGenerated}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  );
}
