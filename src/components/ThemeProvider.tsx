'use client';

import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';

import {
  applyTheme,
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeToTheme,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  readonly preference: ThemePreference;
  readonly setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Estado del tema en tres posiciones: light, dark y system.
 *
 * Usa `useSyncExternalStore` en vez de `useState` + `useEffect`: localStorage es
 * un sistema externo, y leerlo desde un efecto provocaría un render en cascada
 * después del montaje. De paso, el store escucha el evento `storage`, así que
 * cambiar el tema en una pestaña lo sincroniza en las demás.
 *
 * Son ~30 líneas, así que no metemos `next-themes`: la dependencia traería su
 * propio script anti-FOUC y su propia convención de atributos, duplicando lo que
 * ya resuelve `src/lib/theme.ts`.
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  const setPreference = useCallback((next: ThemePreference) => {
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return context;
};
