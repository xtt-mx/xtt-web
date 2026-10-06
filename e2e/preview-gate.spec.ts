import { expect, test } from '@playwright/test';

/**
 * La puerta de la previsualización (`src/proxy.ts`).
 *
 * Existe porque el sitio está desplegado con copy que el cliente todavía no
 * aprueba. `robots.txt` evita que Google lo indexe, pero no que cualquiera con
 * el enlace lo lea, y en un hosting sin un Caddy delante no hay nada más entre
 * internet y la aplicación.
 *
 * El resto de la suite corre **con** credenciales, puestas en
 * `playwright.config.ts`; este archivo es el único que mira la puerta cerrada.
 *
 * ⚠️ Si estos tests fallan en local con un 200 donde se espera un 401, lo más
 * probable es que `reuseExistingServer` haya enganchado un `pnpm dev` que ya
 * estaba escuchando en el 3000 sin las variables. Páralo y vuelve a correr.
 */

/**
 * Petición cruda, fuera de Playwright.
 *
 * Hacen falta dos intentos descartados para llegar aquí, así que queden
 * anotados: ni `test.use({ httpCredentials: undefined })` ni un
 * `playwright.request.newContext()` sin opciones llegan desnudos. Los dos
 * heredan las credenciales del bloque `use`, y como el valor por defecto de
 * `httpCredentials` es reintentar al recibir un 401, la respuesta que observa
 * el test ya es el 200 del segundo intento. Los tests pasaban en verde sin
 * comprobar nada.
 *
 * `fetch` no hereda nada de la config, que es justo lo que se necesita para
 * ver el 401 tal como lo vería un desconocido con el enlace.
 */
const sinCredenciales = (baseURL: string | undefined, ruta: string) =>
  fetch(new URL(ruta, baseURL), { redirect: 'manual' });

test.describe('puerta de previsualización', () => {
  test('la portada sin credenciales devuelve 401', async ({ baseURL }) => {
    const respuesta = await sinCredenciales(baseURL, '/');

    expect(respuesta.status).toBe(401);
    // Sin esta cabecera el navegador no ofrece el diálogo de contraseña y la
    // previsualización queda inaccesible incluso para quien la sabe.
    expect(respuesta.headers.get('www-authenticate')).toContain('Basic');
    expect(respuesta.headers.get('x-robots-tag')).toContain('noindex');
  });

  test('las rutas interiores tampoco se cuelan', async ({ baseURL }) => {
    for (const ruta of ['/soluciones', '/nosotros', '/contacto', '/en/solutions']) {
      expect(
        (await sinCredenciales(baseURL, ruta)).status,
        `${ruta} debería estar detrás de la contraseña`,
      ).toBe(401);
    }
  });

  test('unas credenciales equivocadas no entran', async ({ playwright, baseURL }) => {
    const contexto = await playwright.request.newContext({
      baseURL,
      httpCredentials: { username: 'xtt', password: 'la-que-no-es' },
    });

    expect((await contexto.get('/')).status()).toBe(401);
    await contexto.dispose();
  });

  test('los estáticos y las route handlers quedan fuera del matcher', async ({
    baseURL,
  }) => {
    // Es una consecuencia conocida del matcher, no un descuido: cubrirlas
    // costaría los 404 que documenta el comentario de `config` en proxy.ts.
    expect((await sinCredenciales(baseURL, '/logo-xtt.svg')).status).toBe(200);
    expect((await sinCredenciales(baseURL, '/api/health')).status).toBe(200);
  });
});

test('con las credenciales correctas el sitio responde y pide noindex', async ({
  page,
}) => {
  const respuesta = await page.goto('/');

  expect(respuesta?.status()).toBe(200);
  expect(respuesta?.headers()['x-robots-tag']).toContain('noindex');
});
