'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  GitBranch,
  MessageSquare,
  MoreHorizontal,
  Radio,
  Users,
} from 'lucide-react';

import { useTotalUnread } from '@/hooks/use-total-unread';
import { cn } from '@/lib/utils';

/**
 * Mobile bottom tab bar. Covers the four highest-frequency destinations;
 * everything else stays in the hamburger drawer (opened via `onOpenMore`).
 * Desktop (`lg+`) hides itself — the sidebar takes over there.
 */
export function MobileBottomNav({ onOpenMore }: { onOpenMore?: () => void }) {
  const t = useTranslations('Sidebar');
  const pathname = usePathname();
  const totalUnread = useTotalUnread();

  const items = [
    { href: '/inbox', labelKey: 'inbox', icon: MessageSquare },
    { href: '/contacts', labelKey: 'contacts', icon: Users },
    { href: '/pipelines', labelKey: 'pipelines', icon: GitBranch },
    { href: '/broadcasts', labelKey: 'broadcasts', icon: Radio },
  ] as const;

  return (
    <nav
      aria-label="Main"
      className="border-border bg-card/95 pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t backdrop-blur lg:hidden"
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="relative">
              <Icon className="size-5" />
              {item.href === '/inbox' && totalUnread > 0 && !isActive && (
                <span
                  aria-label={t('unreadConversations', {
                    count: totalUnread,
                  })}
                  className="bg-primary absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full"
                />
              )}
            </span>
            {t(item.labelKey as string)}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onOpenMore}
        aria-label={t('openMenu')}
        className={cn(
          'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
          pathname.startsWith('/settings')
            ? 'text-primary'
            : 'text-muted-foreground'
        )}
      >
        <MoreHorizontal className="size-5" />
        {t('more')}
      </button>
    </nav>
  );
}
