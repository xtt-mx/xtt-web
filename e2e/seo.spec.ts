import { expect, test } from '@playwright/test';

import { solutions } from '../src/config/solutions';
import { routing } from '../src/i18n/routing';

/**
 * `robots.txt` y `sitemap.xml`.
 *
 * Los dos se generan en tiempo de BUILD, así que esta suite solo puede ver el
 * entorno con el que se compiló —producción, porque Playwright arranca sin
 * `NEXT_PUBLIC_SITE_URL` y `siteUrl` cae al dominio canónico—. Lo que se prueba
 * aquí es esa mitad: que el sitio real se deja indexar y anuncia su sitemap
 * completo.
 *
 * La otra mitad —que una previsualización NO se deje indexar— no se puede
 * comprobar desde aquí sin un segundo build, y se verificó a mano compilando
 * con una URL que no es la canónica. El criterio vive en `src/app/robots.ts` y
 * son tres líneas; si alguna vez se complica, merece su propio build en CI.
 */

test.describe('robots.txt', () => {
  test('el sitio de producción se deja indexar y anuncia su sitemap', async ({
    request,
  }) => {
    const robots = await (await request.get('/robots.txt')).text();

    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Sitemap:');

    // Los handlers que reenvían a n8n no son páginas y no tienen nada que
    // indexar; aparecer en resultados solo invita a que los prueben.
    expect(robots).toContain('Disallow: /api/');

    // Si esto aparece, el build se hizo con una URL que no es la canónica y el
    // sitio entero quedaría fuera de Google.
    expect(robots).not.toMatch(/^Disallow: \/$/m);
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
