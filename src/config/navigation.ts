// `import type` puro: se borra en el build, así que este módulo sigue sin arrastrar
// runtime de Next y puede consumirse desde un script de Node.
import type { AppPathname } from '@/i18n/routing';

import type { Locale } from './types';

/**
 * Los cinco apartados del nav, exactamente como los pidió Sergio:
 * Inicio · Nosotros · Nuestras soluciones · Partner Locator · Contacto
 *
 * `key` apunta a `nav.<key>` en los archivos de mensajes; ninguna etiqueta se
 * escribe en JSX. Es la versión formal de la idea de `ctaLabels` de INGEK y, de
 * paso, la rampa a i18n sin trabajo extra.
 *
 * `href` se tipa contra los pathnames declarados en el routing: si alguien
 * escribe una ruta que no existe, no compila.
 */
export interface NavItem {
  readonly key: 'home' | 'about' | 'solutions' | 'partnerLocator' | 'contact';
  /** Ruta canónica en español. next-intl traduce el pathname para /en. */
  readonly href: AppPathname;
}

export const navItems: readonly NavItem[] = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/nosotros' },
  { key: 'solutions', href: '/soluciones' },
  { key: 'partnerLocator', href: '/partner-locator' },
  { key: 'contact', href: '/contacto' },
] as const;

/** Rutas que existen fuera del nav principal (footer, legales). */
export const secondaryRoutes = {
  privacy: '/privacidad',
} as const satisfies Record<string, AppPathname>;

export const locales: readonly Locale[] = ['es', 'en'] as const;
export const defaultLocale: Locale = 'es';
