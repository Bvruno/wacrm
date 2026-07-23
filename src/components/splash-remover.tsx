'use client'

import { useEffect } from 'react'

export function SplashRemover() {
  useEffect(() => {
    requestAnimationFrame(() => {
      document.documentElement.setAttribute('data-hydrated', '')
    })
  }, [])

  return null
}
