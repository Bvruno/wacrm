import { useTranslations } from 'next-intl';
import {
  MessageCircle,
  TrendingUp,
  Megaphone,
  Workflow,
  Sparkles,
  Check,
} from 'lucide-react';
import { CtaSection } from '@/components/marketing/cta-section';

const featureKeys = [
  {
    key: 'sharedInbox',
    icon: MessageCircle,
  },
  {
    key: 'pipeline',
    icon: TrendingUp,
  },
  {
    key: 'broadcasts',
    icon: Megaphone,
  },
  {
    key: 'automations',
    icon: Workflow,
  },
  {
    key: 'aiAssistant',
    icon: Sparkles,
  },
];

export default function FeaturesPage() {
  const t = useTranslations('LandingPage.featuresPage');

  return (
    <>
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-4 text-lg">
              {t('subtitle')}
            </p>
          </div>

          <div className="mt-20 space-y-24">
            {featureKeys.map(({ key, icon: Icon }, i) => (
              <div
                key={key}
                className={`flex flex-col items-center gap-12 ${
                  i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                <div className="flex-1">
                  <div className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-xl">
                    <Icon className="size-7" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold">
                    {t(`${key}.title`)}
                  </h2>
                  <p className="text-muted-foreground mt-3">
                    {t(`${key}.description`)}
                  </p>
                  <ul className="mt-6 space-y-2">
                    {(['0', '1', '2', '3'] as const).map((_, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-sm">
                        <Check className="text-primary size-4" />
                        <span>{t(`${key}.features.${fi}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <div className="bg-muted/30 flex aspect-video w-full max-w-md items-center justify-center rounded-2xl border">
                    <Icon className="text-muted-foreground/40 size-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaSection />
    </>
  );
}
