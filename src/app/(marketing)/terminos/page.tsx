import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { CtaSection } from '@/components/marketing/cta-section';

export const metadata: Metadata = {
  title: 'Condiciones de Servicio',
  description:
    'Los términos que rigen el uso de CodixIA, el CRM auto-hospedable para WhatsApp.',
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  'acceptance',
  'license',
  'account',
  'use',
  'whatsapp',
  'availability',
  'liability',
  'termination',
  'changes',
  'contact',
] as const;

export default function TermsPage() {
  const t = useTranslations('LandingPage.termsPage');

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
            <p className="text-muted-foreground mt-2 text-sm">
              {t('lastUpdated')}
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl space-y-12">
            {sections.map((key) => (
              <div key={key}>
                <h2 className="text-xl font-semibold">
                  {t(`sections.${key}.title`)}
                </h2>
                <div className="mt-3 space-y-3">
                  {(t.raw(`sections.${key}.content`) as string[]).map(
                    (paragraph) => (
                      <p
                        key={paragraph}
                        className="text-muted-foreground leading-relaxed"
                      >
                        {paragraph}
                      </p>
                    ),
                  )}
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
