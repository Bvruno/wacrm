'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'

export function MarketingHeader() {
  const t = useTranslations('LandingPage.header')

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MessageCircle className="size-6 text-primary" />
          <span className="text-lg">CodixIA</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('features')}
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('pricing')}
          </Link>
          <Link
            href="/about"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('about')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            {t('signIn')}
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            {t('signUp')}
          </Link>
        </div>
      </div>
    </header>
  )
}
