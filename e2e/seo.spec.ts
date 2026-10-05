import { expect, test } from '@playwright/test';

import { solutions } from '../src/config/solutions';
import { routing } from '../src/i18n/routing';

/**
 * `robots.txt` y `sitemap.xml`.
 *
 * `robots.txt` decide por la cabecera `Host` de la petición, así que las dos
 * ramas se pueden comprobar desde una sola instancia: basta con pedirlo dos
 * veces cambiando ese encabezado. Con la versión anterior —que miraba una
 * variable de entorno fijada en el build— habría hecho falta compilar dos veces
 * y la mitad importante se quedaba sin test.
 */

test.describe('robots.txt', () => {
  test('en el dominio real se deja indexar y anuncia su sitemap', async ({ request }) => {
    const robots = await (
      await request.get('/robots.txt', { headers: { host: 'xtt.com.mx' } })
    ).text();

    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap:');

    // Los handlers que reenvían a n8n no son páginas y no tienen nada que
    // indexar; aparecer en resultados solo invita a que los prueben.
    expect(robots).toContain('Disallow: /api/');
    expect(robots).not.toMatch(/^Disallow: \/$/m);
  });

  /**
   * El que de verdad protege. Un despliegue de ensayo accesible se indexa solo
   * y acaba compitiendo en Google con el sitio real, con los textos todavía sin
   * aprobar — y deshacerlo es pedirle a Google que olvide páginas, que tarda
   * semanas. Si este test se pone rojo, no se publica.
   */
  test('en cualquier otro dominio lo prohíbe todo', async ({ request }) => {
    for (const host of [
      'coral-hedgehog-358900.hostingersite.com',
      'srv1827163.hstgr.cloud',
      'localhost:3000',
    ]) {
      const robots = await (
        await request.get('/robots.txt', { headers: { host } })
      ).text();

      expect(robots, `${host} debería estar cerrado a los buscadores`).toMatch(
        /^Disallow: \/$/m,
      );
      expect(robots, `${host} no debería invitar a indexar`).not.toContain('Allow: /');
    }
  });
});

test.describe('sitemap.xml', () => {
  test('lista todas las rutas, cada una con sus dos idiomas', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();

    const rutas = Object.keys(routing.pathnames);
    const urls = [...sitemap.matchAll(/<loc>/g)].length;

    // Una entrada por ruta: si alguien agrega una página y el sitemap no crece,
    // es que dejó de salir de `routing.pathnames`.
    expect(urls, `el sitemap debería listar las ${rutas.length} rutas`).toBe(
      rutas.length,
    );

    for (const locale of routing.locales) {
      expect(sitemap).toContain(`hreflang="${locale}"`);
    }

    // Los slugs traducidos tienen que estar, no solo los españoles: es lo que
    // evita que Google trate las dos versiones como páginas que compiten.
    expect(sitemap).toContain('/en/about');
    expect(sitemap).toContain('/en/solutions');
  });

  test('las soluciones tienen ancla en la página que enlaza la órbita', async ({
    page,
  }) => {
    // No es del sitemap, pero sí del mismo descuido: el hero enlaza a
    // `/soluciones#<id>` y si el ancla desaparece, los cuatro enlaces caen al
    // principio de la página sin que nada falle a la vista.
    await page.goto('/soluciones');

    for (const solucion of solutions) {
      await expect(page.locator(`#${solucion.id}`)).toBeVisible();
    }
  });
});
