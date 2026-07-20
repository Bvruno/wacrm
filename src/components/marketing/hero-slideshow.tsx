'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const SLIDE_KEYS = ['slide1', 'slide2', 'slide3', 'slide4', 'slide5'] as const
type SlideKey = (typeof SLIDE_KEYS)[number]

const slides: { key: SlideKey; gradient: string; icon: React.ReactNode }[] = [
  {
    key: 'slide1',
    gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
    icon: (
      <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    key: 'slide2',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    icon: (
      <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
      </svg>
    ),
  },
  {
    key: 'slide3',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    icon: (
      <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
  },
  {
    key: 'slide4',
    gradient: 'from-rose-500/20 via-rose-500/5 to-transparent',
    icon: (
      <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.25V6.75A2.25 2.25 0 015.25 4.5zM12 9v6m-3-3h6" />
      </svg>
    ),
  },
  {
    key: 'slide5',
    gradient: 'from-sky-500/20 via-sky-500/5 to-transparent',
    icon: (
      <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
]

export function HeroSlideshow() {
  const t = useTranslations('LandingPage.hero')
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative mx-auto mt-12 max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-xl">
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            className={cn(
              'flex flex-col items-center gap-4 text-center transition-all duration-700',
              i === current
                ? 'scale-100 opacity-100'
                : 'pointer-events-none absolute inset-0 scale-95 opacity-0'
            )}
          >
            <div
              className={cn(
                'flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br',
                slide.gradient
              )}
            >
              {slide.icon}
            </div>
            <p className="text-xl font-semibold">{t(slide.key)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              'size-2 rounded-full transition-all',
              i === current ? 'w-6 bg-primary' : 'bg-muted-foreground/30'
            )}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
