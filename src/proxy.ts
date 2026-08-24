import createMiddleware from 'next-intl/middleware';

import { routing } from '@/i18n/routing';

/**
 * Resuelve el locale por request y reescribe hacia el pathname traducido.
 *
 * En Next 16 esta convención se llama `proxy` (antes `middleware`). next-intl
 * sigue exportando `createMiddleware` con ese nombre; solo cambió el archivo que
 * Next busca.
 */
export default createMiddleware(routing);

export const config = {
  /**
   * Corre en todas las rutas de página, y en ninguna otra.
   *
   * ⚠️ La forma clásica `'/((?!api|_next|_vercel|.*\\..*).*)'` —grupo sin nombre
   * con lookahead seguido de `.*`— **NO funciona en Next 16**: deja de matchear
   * las sub-rutas y solo aplica a `/`. El síntoma es traicionero, porque el sitio
   * arranca bien y todas las páginas interiores devuelven 404 sin ningún error
   * en consola.
   *
   * La forma que sí funciona usa un parámetro **con nombre** y una clase negada
   * en vez de `.*`:
   *
   *   - `:path(...)`  → parámetro nombrado, que es lo que Next sabe compilar.
   *   - `(?!api|...)` → excluye las route handlers y los internos del framework.
   *                     Sin esto, `/api/health` se reescribe a `/es/api/health`
   *                     y el healthcheck del contenedor devuelve 404.
   *   - `[^.]*`       → excluye cualquier ruta con extensión. Sin esto, el proxy
   *                     se traga los estáticos y `/logo-xtt.svg` da 404.
   *
   * `e2e/routing.spec.ts` cubre los cuatro casos; si alguien "simplifica" este
   * matcher, los tests lo atrapan.
   */
  matcher: '/:path((?!api|_next|_vercel)[^.]*)',
};
