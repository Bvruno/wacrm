import { useHotkey } from '@/hooks/use-hotkey'

export function useInboxHotkeys({
  onNavigateUp,
  onNavigateDown,
  onSelectCurrent,
  onEscape,
  onFocusSearch,
  onFocusComposer,
}: {
  onNavigateUp?: () => void
  onNavigateDown?: () => void
  onSelectCurrent?: () => void
  onEscape?: () => void
  onFocusSearch?: () => void
  onFocusComposer?: () => void
}) {
  useHotkey('j', () => onNavigateDown?.(), { preventDefault: true })
  useHotkey('k', () => onNavigateUp?.(), { preventDefault: true })
  useHotkey('Enter', () => onSelectCurrent?.())
  useHotkey('Escape', () => onEscape?.())
  useHotkey('f', () => onFocusSearch?.(), { ctrl: true, preventDefault: true })
  useHotkey('r', () => onFocusComposer?.())
}
