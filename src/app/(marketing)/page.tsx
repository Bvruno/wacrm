import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  MessageCircle,
  TrendingUp,
  Megaphone,
  Workflow,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { FeaturesGrid } from '@/components/marketing/features-grid'
import { PricingCard } from '@/components/marketing/pricing-card'
import { CtaSection } from '@/components/marketing/cta-section'
import { HeroSlideshow } from '@/components/marketing/hero-slideshow'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CtaSection />
    </>
  )
}

function HeroSection() {
  const t = useTranslations('LandingPage')

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <Badge variant="secondary" className="mb-6">
          {t('hero.badge')}
        </Badge>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {t('hero.title')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t('hero.subtitle')}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }))}>
            {t('hero.ctaPrimary')}
            <ArrowRight className="ml-1 size-4" />
          </Link>
          <Link
            href="/features"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            {t('hero.ctaSecondary')}
          </Link>
        </div>
        <HeroSlideshow />
      </div>
    </section>
  )
}

function FeaturesSection() {
  const t = useTranslations('LandingPage.features')

  const features = [
    {
      icon: MessageCircle,
      title: t('sharedInbox.title'),
      description: t('sharedInbox.description'),
    },
    {
      icon: TrendingUp,
      title: t('pipeline.title'),
      description: t('pipeline.description'),
    },
    {
      icon: Megaphone,
      title: t('broadcasts.title'),
      description: t('broadcasts.description'),
    },
    {
      icon: Workflow,
      title: t('automations.title'),
      description: t('automations.description'),
    },
    {
      icon: Sparkles,
      title: t('aiAssistant.title'),
      description: t('aiAssistant.description'),
    },
  ]

  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12">
          <FeaturesGrid features={features} columns={3} />
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/features"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            {t('cta')}
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const t = useTranslations('LandingPage.howItWorks')

  const steps = [
    { key: 'step1', number: '01' },
    { key: 'step2', number: '02' },
    { key: 'step3', number: '03' },
  ]

  return (
    <section className="border-t py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map(({ key, number }, i) => (
            <div key={key} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute top-6 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-4rem)] border-t border-dashed sm:block" />
              )}
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {number}
              </div>
              <h3 className="mt-4 font-semibold">{t(`${key}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`${key}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const t = useTranslations('LandingPage.pricing')

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
    <section className="border-t bg-muted/30 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <PricingCard key={i} {...plan} />
          ))}
        </div>
      </div>
    </section>
  )
}
