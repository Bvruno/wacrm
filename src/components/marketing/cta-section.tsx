import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CtaSection() {
  const t = useTranslations('LandingPage.cta')

  return (
    <section className="border-t bg-muted/50 py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
        <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
            {t('button')}
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('footnote')}</p>
      </div>
    </section>
  )
}
