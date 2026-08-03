import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export function MarketingFooter() {
  const t = useTranslations('LandingPage.footer');

  return (
    <footer className="bg-muted/30 border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <MessageCircle className="text-primary size-5" />
              <span>CodixIA</span>
            </Link>
            <p className="text-muted-foreground text-sm">{t('description')}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('product')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {t('features')}
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {t('pricing')}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {t('about')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('legal')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacidad"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
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
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {t('github')}
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {t('about')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-muted-foreground mt-10 border-t pt-6 text-center text-sm">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
