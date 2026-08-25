import { expect, test } from '@playwright/test';

/**
 * Regresión del matcher del proxy.
 *
 * El matcher de `src/proxy.ts` decide qué rutas pasan por next-intl. Si se
 * rompe, el fallo es silencioso: no hay error en consola ni en el build, el
 * home sigue funcionando, y todo lo demás devuelve 404 — o peor, los estáticos
 * y las route handlers empiezan a devolver 404 mientras las páginas se ven bien.
 *
 * Este spec cubre las cuatro categorías a la vez para que ese caso no vuelva a
 * pasar desapercibido.
 */

test.describe('Matcher del proxy', () => {
  test('las páginas en español responden sin prefijo de locale', async ({ page }) => {
    for (const path of ['/', '/nosotros', '/soluciones']) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} debería responder 200`).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    }
  });

  test('las páginas en inglés responden con su slug traducido', async ({ page }) => {
    for (const path of ['/en', '/en/about', '/en/solutions']) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} debería responder 200`).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    }
  });

  test('las route handlers NO pasan por el proxy', async ({ page }) => {
    // Si el proxy las tocara, las reescribiría a /es/api/... y el healthcheck
    // del contenedor moriría en producción sin avisar.
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('los estáticos NO pasan por el proxy', async ({ page }) => {
    const response = await page.request.get('/logo-xtt.svg');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('svg');
  });
});
