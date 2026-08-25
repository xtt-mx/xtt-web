import { expect, test } from '@playwright/test';

/**
 * Next solo renderiza `not-found.tsx` cuando `notFound()` se llama desde dentro
 * de un segmento, no para cualquier URL desconocida. El catch-all de
 * `[locale]/[...rest]` es lo que cierra ese hueco; sin él el visitante ve el
 * 404 crudo del framework, sin chrome, sin tema y en inglés.
 */

test.describe('404', () => {
  test('una URL inexistente devuelve 404 y muestra la página del sitio', async ({
    page,
  }) => {
    const response = await page.goto('/esta-ruta-no-existe');

    // El status importa tanto como lo que se ve: un 404 que responde 200 le
    // dice a Google que indexe una página vacía.
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Esta página ya no existe');
  });

  test('conserva el chrome del sitio, que es la salida del visitante', async ({
    page,
  }) => {
    await page.goto('/esta-ruta-no-existe');

    // `banner` y no el nav principal: en móvil ese nav vive detrás del botón de
    // menú, y la prueba mediría el ancho de la ventana en vez del chrome.
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();

    await page.getByRole('main').getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test('respeta el idioma de la URL', async ({ page }) => {
    const response = await page.goto('/en/this-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('This page no longer exists');
  });

  test('las rutas anidadas inexistentes también caen aquí', async ({ page }) => {
    // El catch-all es `[...rest]`, no `[rest]`: sin los puntos suspensivos solo
    // atraparía un nivel y `/soluciones/lo-que-sea` se escaparía.
    const response = await page.goto('/soluciones/lo-que-sea/y-mas');

    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Esta página ya no existe');
  });

  test('el 404 pide noindex y las páginas reales no llevan directiva', async ({
    page,
  }) => {
    await page.goto('/esta-ruta-no-existe');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex',
    );

    // Una sola directiva: declarar `index, follow` en el layout no cambiaba el
    // comportamiento por defecto y contradecía al `noindex` del 404.
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);

    await page.goto('/nosotros');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });
});
