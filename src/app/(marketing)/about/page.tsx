import { useTranslations } from 'next-intl'
import { MessageCircle, Shield, Code } from 'lucide-react'
import { CtaSection } from '@/components/marketing/cta-section'

export default function AboutPage() {
  const t = useTranslations('LandingPage.aboutPage')

  const sections = [
    { key: 'mission', icon: MessageCircle },
    { key: 'why', icon: Shield },
    { key: 'stack', icon: Code },
  ]

  return (
    <>
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl space-y-16">
            {sections.map(({ key, icon: Icon }) => (
              <div key={key} className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{t(`${key}.title`)}</h2>
                  <p className="mt-2 text-muted-foreground">{t(`${key}.description`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaSection />
    </>
  )
}
