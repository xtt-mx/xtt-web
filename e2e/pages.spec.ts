import { expect, test } from '@playwright/test';

/**
 * Todo se acota a `<main>`: el footer también tiene encabezados de nivel 2 y
 * repite el nombre de la marca, así que un locator suelto mide el chrome de la
 * página en vez de su contenido.
 */

test.describe('Nosotros', () => {
  test('muestra la propuesta de valor, misión y visión', async ({ page }) => {
    await page.goto('/nosotros');
    const main = page.getByRole('main');

    await expect(page.locator('h1')).toContainText('mayorista');

    // Misión y visión son los dos textos que Sergio tiene que aprobar; que
    // existan como encabezados propios es lo que hace la página revisable.
    await expect(main.getByRole('heading', { name: 'Misión', level: 2 })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Visión', level: 2 })).toBeVisible();

    // `exact` distingue la cifra suelta del "fundada en 2018" del párrafo.
    await expect(main.getByText('2018', { exact: true })).toBeVisible();
  });

  test('el título de la pestaña usa la plantilla de marca', async ({ page }) => {
    await page.goto('/nosotros');
    await expect(page).toHaveTitle(/· XTT$/);
  });
});

test.describe('Soluciones', () => {
  test('lista las cuatro soluciones del brief, en orden', async ({ page }) => {
    await page.goto('/soluciones');

    const names = page.getByRole('main').getByRole('heading', { level: 2 });
    await expect(names).toHaveText([
      'CCaaS',
      'SBCs y análisis de data telecom',
      'Mensajería y canales digitales',
      'Telefonía SIP',
    ]);
  });

  test('es una lista ordenada, no un grid de tarjetas sueltas', async ({ page }) => {
    await page.goto('/soluciones');
    const main = page.getByRole('main');

    // La semántica importa: son cuatro líneas de negocio con orden, y un lector
    // de pantalla debe anunciar "lista de 4 elementos".
    await expect(main.getByRole('listitem')).toHaveCount(4);
  });
});
