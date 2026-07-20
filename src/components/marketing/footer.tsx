import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

export function MarketingFooter() {
  const t = useTranslations('LandingPage.footer')

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <MessageCircle className="size-5 text-primary" />
              <span>CodixIA</span>
            </Link>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('product')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">
                  {t('features')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                  {t('pricing')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                  {t('about')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('legal')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                  {t('terms')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('resources')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://github.com/ArnasDon/wacrm"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t('github')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                  {t('about')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  )
}
