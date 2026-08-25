import { expect, test } from '@playwright/test';

/**
 * El directorio de partners está vacío a propósito hasta que Sergio entregue el
 * listado real (ver `src/config/partners.ts`). Estas pruebas fijan el
 * comportamiento del estado vacío, que hoy es lo que ve todo el mundo, y el de
 * los filtros, que con cero datos no se puede comprobar a ojo.
 */

test.describe('Partner Locator', () => {
  test('el estado vacío explica y ofrece salida, en vez de dejar la página muda', async ({
    page,
  }) => {
    await page.goto('/partner-locator');
    const main = page.getByRole('main');

    await expect(main.getByText('Todavía no publicamos el directorio')).toBeVisible();

    // La salida importa tanto como el aviso: sin ella el visitante que sí quiere
    // un partner se queda sin siguiente paso.
    await expect(main.getByRole('link', { name: 'Contactar a XTT' })).toHaveAttribute(
      'href',
      '/contacto',
    );
  });

  test('los filtros ofrecen toda la cobertura, no solo los países con partner', async ({
    page,
  }) => {
    await page.goto('/partner-locator');

    // 13 países cubiertos + "Todos". Si el filtro se alimentara de `partners`
    // —hoy vacío— quedaría con una sola opción y sería inútil.
    await expect(page.getByLabel('País').locator('option')).toHaveCount(14);
    await expect(page.getByLabel('Solución').locator('option')).toHaveCount(5);
  });

  test('filtrar no rompe la página ni miente sobre el resultado', async ({ page }) => {
    await page.goto('/partner-locator');
    const main = page.getByRole('main');

    await page.getByLabel('País').selectOption('CR');
    await page.getByLabel('Solución').selectOption('ccaas');

    // Con el directorio vacío cualquier combinación da cero, y el contador debe
    // decirlo en vez de quedarse con el número anterior.
    await expect(main.getByText('Sin partners')).toBeVisible();
    await expect(main.getByText('Todavía no publicamos el directorio')).toBeVisible();
  });

  test('la cobertura no repite el país cuando la región es ese país', async ({
    page,
  }) => {
    await page.goto('/partner-locator');

    // Se acota a la sección de cobertura: los nombres de país salen también en
    // los `<option>` del filtro, y un locator sobre `main` mide las dos cosas.
    const presence = page.getByRole('region', { name: 'Dónde operamos' });

    await expect(presence.getByText('Guatemala')).toBeVisible();
    await expect(presence.getByText('Trinidad y Tobago')).toBeVisible();

    // "México" aparece una vez, como región; repetirlo como país no informa nada.
    await expect(presence.getByText('México', { exact: true })).toHaveCount(1);
    await expect(presence.getByText('Colombia', { exact: true })).toHaveCount(1);
  });
});
