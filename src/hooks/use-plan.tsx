'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface PlanData {
  plan: { name: string; slug: string; price: number; currency: string } | null
  status: string
  trialEndsAt: string | null
  limits: {
    maxAgents: number
    maxMessagesPerDay: number
    has_broadcasts: boolean
    has_automations: boolean
    has_ai_assistant: boolean
  }
  usage: {
    agents: number
    messagesToday: number
  }
}

const POLL_INTERVAL_MS = 15_000

export function usePlan() {
  const [data, setData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/account/plan')
      if (!res.ok) return
      const json: PlanData = await res.json()
      setData(json)
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll every 15s so plan changes from admin are reflected quickly
  useEffect(() => {
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [refresh])

  // Refresh on tab visibility change (tab focus)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  return { data, loading, refresh }
}
