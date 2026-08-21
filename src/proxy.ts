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
   * Todo excepto las rutas de API, los estáticos de Next y cualquier archivo con
   * extensión. Sin este filtro el proxy correría en cada imagen y fuente, que es
   * puro costo sin beneficio.
   */
  matcher: '/((?!api|_next|_vercel|.*\..*).*)',
};
