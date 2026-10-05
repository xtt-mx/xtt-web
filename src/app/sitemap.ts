import type { MetadataRoute } from 'next';

import { siteUrl } from '@/config/brand';
import type { Locale } from '@/config/types';
import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { AppPathname } from '@/i18n/routing';

/**
 * Sitemap.
 *
 * Importa más de lo normal porque este sitio SUSTITUYE a un WordPress cuyas URLs
 * llevan años indexadas y ahora responden 301 (ver `src/config/redirects.ts`).
 * Sin un sitemap, Google descubre el cambio a base de recrawl y tarda semanas;
 * con él, se le entrega el mapa nuevo de una vez.
 *
 * Las rutas NO se escriben aquí: salen de `routing.pathnames`, que ya es la
 * fuente de verdad del ruteo. Una página nueva entra sola en el sitemap, y una
 * que se renombre no puede quedarse apuntando al slug viejo.
 *
 * Cada entrada declara sus dos idiomas en `alternates.languages`, que es el
 * `hreflang` del sitemap. Es el mismo criterio que ya sigue `src/lib/metadata.ts`
 * con los `alternates` de cada página: sin eso, Google trata la versión en
 * español y la inglesa como páginas distintas compitiendo entre sí.
 */

const rutas = Object.keys(routing.pathnames) as readonly AppPathname[];

const absoluta = (href: AppPathname, locale: Locale): string =>
  new URL(getPathname({ href, locale }), siteUrl).toString();

/**
 * Sin `lastModified`, `changeFrequency` ni `priority`.
 *
 * Google ignora las dos últimas desde hace años, y de la primera no tenemos un
 * dato real: poner `new Date()` en cada build declara que todas las páginas
 * cambiaron a la vez cada vez que se despliega, que es sencillamente falso.
 * Un sitemap que miente vale menos que uno escueto.
 */
const sitemap = (): MetadataRoute.Sitemap =>
  rutas.map((href) => ({
    url: absoluta(href, routing.defaultLocale),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, absoluta(href, locale)]),
      ),
    },
  }));

export default sitemap;
