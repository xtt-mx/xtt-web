import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';

const intl = createMiddleware(routing);

/**
 * Comparación en tiempo constante.
 *
 * Con `===` el tiempo de respuesta depende de cuántos caracteres coinciden, y eso
 * filtra la contraseña carácter a carácter. Es una barrera de previsualización y
 * el riesgo real es mínimo, pero escribir la versión lenta cuesta cinco líneas.
 * El runtime edge no trae `crypto.timingSafeEqual`, de ahí el bucle a mano.
 */
const iguales = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
};

/**
 * Resuelve el locale por request y reescribe hacia el pathname traducido.
 *
 * En Next 16 esta convención se llama `proxy` (antes `middleware`). next-intl
 * sigue exportando `createMiddleware` con ese nombre; solo cambió el archivo que
 * Next busca.
 *
 * Además hace de puerta cuando el despliegue es una previsualización. Eso lo
 * cubría `Caddyfile.preview` en el VPS, pero en un hosting que no pone un Caddy
 * delante —Vercel, por ejemplo, cuyo plan gratuito no ofrece contraseña— no hay
 * nada entre internet y la aplicación. Y este sitio no debe ser legible mientras
 * la copy siga sin aprobar: `robots.txt` evita que Google lo indexe, pero no que
 * cualquiera con el enlace lo lea.
 *
 * El entorno lo decide la presencia de las dos variables, no una bandera que
 * alguien tenga que acordarse de apagar: en producción simplemente no existen y
 * la puerta no se monta.
 */
const proxy = (request: NextRequest) => {
  const usuario = process.env.PREVIEW_USER;
  const contrasena = process.env.PREVIEW_PASSWORD;

  // Las dos, o ninguna. Con una sola configurada la puerta quedaría abierta sin
  // que nadie se diera cuenta, que es el peor de los tres estados.
  if (usuario && contrasena) {
    const recibido = request.headers.get('authorization') ?? '';
    const esperado = `Basic ${btoa(`${usuario}:${contrasena}`)}`;

    if (!iguales(recibido, esperado)) {
      // Cuerpo de una respuesta HTTP, no copy de la interfaz: no va a messages/.
      return new NextResponse('401 Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="XTT", charset="UTF-8"',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
        },
      });
    }

    // Cinturón además de tirantes: si algún día se quita la contraseña para
    // enseñárselo a alguien, esto sigue diciéndole a los buscadores que no.
    const respuesta = intl(request);
    respuesta.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return respuesta;
  }

  return intl(request);
};

export default proxy;

export const config = {
  /**
   * Corre en todas las rutas de página, y en ninguna otra.
   *
   * ⚠️ La forma clásica `'/((?!api|_next|_vercel|.*\..*).*)'` —grupo sin nombre
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
   *
   * Consecuencia para la puerta de previsualización: las route handlers quedan
   * fuera, así que `/api/*` responde sin contraseña. Es lo mismo que hacen en
   * producción —el formulario de contacto las llama desde el navegador— y
   * tocar este matcher para cubrirlas costaría los cuatro 404 de arriba.
   */
  matcher: '/:path((?!api|_next|_vercel)[^.]*)',
};
