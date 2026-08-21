import { defineRouting } from 'next-intl/routing';

/**
 * Ruteo bilingüe ES/EN.
 *
 * `localePrefix: 'as-needed'` deja el español en la raíz (`/nosotros`) y prefija
 * solo el inglés (`/en/about`). Es lo correcto aquí: el tráfico es mayoritariamente
 * hispanohablante y mover el sitio entero a `/es/*` invalidaría las URLs que ya
 * están indexadas.
 *
 * Los `pathnames` traducen el slug además del contenido; sin esto, la versión en
 * inglés quedaría en `/en/nosotros`, que se lee como un sitio a medio traducir.
 */
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',

  /**
   * Sin autodetección por `Accept-Language`.
   *
   * Con `as-needed` el español no lleva prefijo, así que dejar la detección
   * activa hace que `/` devuelva español o inglés según el navegador: la misma
   * URL con dos contenidos. Eso rompe el cacheo en CDN y hace que Google indexe
   * la canónica en el idioma equivocado.
   *
   * `/` es español siempre, `/en` es inglés siempre, y el usuario elige con el
   * switcher del header.
   */
  localeDetection: false,
  pathnames: {
    '/': '/',
    '/nosotros': {
      es: '/nosotros',
      en: '/about',
    },
    '/soluciones': {
      es: '/soluciones',
      en: '/solutions',
    },
    '/partner-locator': {
      es: '/partner-locator',
      en: '/partner-locator',
    },
    '/contacto': {
      es: '/contacto',
      en: '/contact',
    },
    '/privacidad': {
      es: '/privacidad',
      en: '/privacy',
    },
  },
});

export type AppPathname = keyof typeof routing.pathnames;
