'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Hydration-safe mount gate: SSR + first client pass render `false`,
  // so the localStorage-backed `collapsed` initializer can't mismatch
  // the server HTML. No effect setState involved.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [collapsed, setCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_KEY) === 'true';
      } catch {}
    }
    return false;
  });

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  if (!mounted) return null;

  return (
    <SidebarContext.Provider
      value={{ collapsed, toggleCollapsed, setCollapsed }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
