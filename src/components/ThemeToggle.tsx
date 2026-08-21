'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import {
  applyTheme,
  isThemePreference,
  THEME_STORAGE_KEY,
  toggleTheme,
} from '@/lib/theme';

import styles from './ThemeToggle.module.css';

/**
 * Un solo botón que alterna claro ↔ oscuro.
 *
 * Antes eran tres opciones (claro / auto / oscuro) y cargaban demasiado el
 * header. "Auto" sigue siendo el estado inicial —quien nunca toca el botón ve
 * lo que dicte su sistema operativo—, solo que dejó de ser una posición
 * seleccionable: en cuanto alguien pulsa, expresó una preferencia explícita.
 *
 * El icono lo decide CSS, no React. Se renderizan los dos y el media query
 * —el mismo que gobierna los tokens— muestra el que toca. Así el servidor no
 * necesita adivinar el tema del visitante: no hay mismatch de hidratación ni
 * un parpadeo de icono equivocado en el primer paint.
 *
 * Por lo mismo la etiqueta accesible es fija ("Cambiar tema") en vez de
 * "Cambiar a oscuro": un texto que dependa del estado sí se renderizaría mal
 * en el servidor, y CSS no puede corregir texto.
 */
export const ThemeToggle = () => {
  const t = useTranslations('theme');

  // Si el visitante cambia el tema en otra pestaña del sitio, esta lo refleja.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      if (isThemePreference(event.newValue)) {
        applyTheme(event.newValue, { persist: false });
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={t('toggle')}
      title={t('toggle')}
      onClick={toggleTheme}
    >
      <Sun
        size={17}
        strokeWidth={2}
        className={styles.sun}
        data-icon="sun"
        aria-hidden="true"
      />
      <Moon
        size={16}
        strokeWidth={2}
        className={styles.moon}
        data-icon="moon"
        aria-hidden="true"
      />
    </button>
  );
};
