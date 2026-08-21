'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/cn';
import type { ThemePreference } from '@/lib/theme';

import styles from './ThemeToggle.module.css';

const OPTIONS = [
  { value: 'light', Icon: Sun },
  { value: 'system', Icon: Monitor },
  { value: 'dark', Icon: Moon },
] as const satisfies readonly { value: ThemePreference; Icon: typeof Sun }[];

/**
 * Selector de tema de tres posiciones.
 *
 * Es un `radiogroup` y no tres botones sueltos ni un switch: hay tres estados
 * mutuamente excluyentes, y "system" no es representable con un booleano. Cada
 * opción es un `<button role="radio">` real, así que funciona con teclado y los
 * lectores de pantalla anuncian cuál está activa.
 */
export const ThemeToggle = () => {
  const t = useTranslations('theme');
  const { preference, setPreference } = useTheme();

  return (
    <div className={styles.group} role="radiogroup" aria-label={t('label')}>
      {OPTIONS.map(({ value, Icon }) => {
        const isActive = preference === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={t(value)}
            title={t(value)}
            className={cn(styles.option, isActive && styles.active)}
            onClick={() => setPreference(value)}
          >
            {/* El ícono es decorativo: el nombre accesible ya viene del aria-label. */}
            <Icon size={15} strokeWidth={2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};
