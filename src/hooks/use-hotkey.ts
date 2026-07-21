'use client'

import { useEffect, useRef } from 'react'

interface HotkeyOptions {
  enabled?: boolean
  preventDefault?: boolean
  ctrl?: boolean
  shift?: boolean
  meta?: boolean
}

const DEFAULT_OPTIONS: HotkeyOptions = {
  enabled: true,
  preventDefault: false,
  ctrl: false,
  shift: false,
  meta: false,
}

/**
 * Registers a keyboard shortcut handler scoped to a component lifecycle.
 * Automatically skips when the user is typing in an input / textarea /
 * contenteditable (unless `ctrl` or `meta` is set, to allow shortcuts
 * like Ctrl+F or Ctrl+Enter while focused in an input).
 */
export function useHotkey(
  key: string,
  handler: () => void,
  options?: HotkeyOptions,
) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!opts.enabled) return

    const listener = (e: KeyboardEvent) => {
      const match =
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === !!opts.ctrl &&
        e.shiftKey === !!opts.shift &&
        e.metaKey === !!opts.meta

      if (!match) return

      // Skip when focused on inputs unless the shortcut uses a modifier
      // (Ctrl+F, Ctrl+Enter, etc.) — power-users expect these to work
      // everywhere.
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      const hasModifier = opts.ctrl || opts.meta
      if (isInput && !hasModifier) return

      if (opts.preventDefault) e.preventDefault()
      handlerRef.current()
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, opts.enabled, opts.ctrl, opts.shift, opts.meta, opts.preventDefault])
}
