'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';

import styles from './LocaleSwitcher.module.css';

/**
 * Cambia de idioma conservando la ruta actual.
 *
 * `usePathname` de next-intl devuelve el pathname sin locale y ya des-traducido,
 * así que `router.replace` puede volver a resolverlo contra el otro idioma. Con el
 * `usePathname` de Next esto no funcionaría: /about no se mapearía de vuelta a
 * /nosotros y el switch mandaría a un 404.
 */
export const LocaleSwitcher = () => {
  const t = useTranslations('locale');
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className={styles.group} role="group" aria-label={t('label')}>
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;

        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-current={isActive ? 'true' : undefined}
            aria-label={t(locale)}
            disabled={isPending || isActive}
            className={cn(styles.option, isActive && styles.active)}
            onClick={() => {
              startTransition(() => {
                // No hay segmentos dinámicos en el sitio; el pathname basta.
                router.replace({ pathname }, { locale });
              });
            }}
          >
            {locale}
          </button>
        );
      })}
    </div>
  );
};
