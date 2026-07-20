import { useTranslations } from 'next-intl'
import { PricingCard } from '@/components/marketing/pricing-card'
import { CtaSection } from '@/components/marketing/cta-section'

export default function PricingPage() {
  const t = useTranslations('LandingPage.pricing')
  const pt = useTranslations('LandingPage.pricingPage')

  const plans = [
    {
      name: t('free.name'),
      description: t('free.description'),
      price: t('free.price'),
      period: t('free.period'),
      features: [
        t('free.features.0'),
        t('free.features.1'),
        t('free.features.2'),
        t('free.features.3'),
        t('free.features.4'),
      ],
      cta: t('free.cta'),
    },
    {
      name: t('pro.name'),
      description: t('pro.description'),
      price: t('pro.price'),
      period: t('pro.period'),
      features: [
        t('pro.features.0'),
        t('pro.features.1'),
        t('pro.features.2'),
        t('pro.features.3'),
        t('pro.features.4'),
      ],
      cta: t('pro.cta'),
      popular: true,
      popularLabel: t('pro.popular'),
    },
    {
      name: t('enterprise.name'),
      description: t('enterprise.description'),
      price: t('enterprise.price'),
      period: t('enterprise.period'),
      features: [
        t('enterprise.features.0'),
        t('enterprise.features.1'),
        t('enterprise.features.2'),
        t('enterprise.features.3'),
        t('enterprise.features.4'),
      ],
      cta: t('enterprise.cta'),
      href: '/about',
    },
  ]

  return (
    <>
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{pt('title')}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{pt('subtitle')}</p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <PricingCard key={i} {...plan} />
            ))}
          </div>
        </div>
      </section>
      <CtaSection />
    </>
  )
}
