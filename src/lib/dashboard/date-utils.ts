import {
  startOfDay,
  subDays,
  format,
  addDays,
} from 'date-fns'

export function startOfLocalDay(d: Date = new Date()): Date {
  return startOfDay(d)
}

export function daysAgoStart(days: number): Date {
  return startOfDay(subDays(new Date(), days))
}

export function localDayKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return format(date, 'yyyy-MM-dd')
}

export function lastNDayKeys(n: number): string[] {
  const keys: string[] = []
  const start = subDays(startOfDay(new Date()), n - 1)
  for (let i = 0; i < n; i++) {
    keys.push(format(addDays(start, i), 'yyyy-MM-dd'))
  }
  return keys
}

export function mondayIndex(d: Date): number {
  const jsDow = d.getDay()
  return (jsDow + 6) % 7
}

export const DOW_SHORT_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
