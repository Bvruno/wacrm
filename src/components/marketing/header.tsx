'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Menu, MessageCircle } from 'lucide-react';

export function MarketingHeader() {
  const t = useTranslations('LandingPage.header');
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '/features', label: t('features') },
    { href: '/pricing', label: t('pricing') },
    { href: '/about', label: t('about') },
  ];

  return (
    <header className="bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MessageCircle className="text-primary size-6" />
          <span className="text-lg">CodixIA</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            {t('signIn')}
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }))}>
            {t('signUp')}
          </Link>

          {/* Mobile menu */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label={t('openMenu')}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground -mr-1 flex h-10 w-10 items-center justify-center rounded-md transition-colors md:hidden"
                >
                  <Menu className="size-5" />
                </button>
              }
            />
            <SheetContent side="right" className="w-72 p-6">
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-border mt-4 flex flex-col gap-2 border-t pt-4">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      buttonVariants({ variant: 'ghost' }),
                      'w-full'
                    )}
                  >
                    {t('signIn')}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className={cn(buttonVariants(), 'w-full')}
                  >
                    {t('signUp')}
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
