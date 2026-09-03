import { expect, test } from '@playwright/test';

/**
 * El aviso no es contenido nuevo: se migró desde
 * `/politicas-de-privacidad-xtt` del WordPress anterior. Estas pruebas fijan
 * que siga alcanzable por las tres vías que lo enlazan —formulario, footer y
 * la URL vieja— porque un aviso de privacidad inalcanzable es un problema
 * legal, no una página rota más.
 */

test.describe('Aviso de privacidad', () => {
  /**
   * Las siete del original más la del chat, que se intercala tras "Compartir
   * información" cuando el asistente está montado —la suite lo corre encendido,
   * ver `playwright.config.ts`—. Es la mitad legal de la función: el chat guarda
   * conversaciones, así que el aviso tiene que declararlo, y las dos mitades
   * cuelgan de la misma bandera para que no pueda publicarse solo una.
   */
  test('conserva las secciones del original, en orden, con la del chat', async ({
    page,
  }) => {
    await page.goto('/privacidad');

    // El orden de un texto legal es parte del texto.
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText([
      'Información que recopilamos',
      'Uso de la información',
      'Compartir información',
      'Asistente de chat',
      'Seguridad de la información',
      'Acceso y control de su información',
      'Cambios en la política de privacidad',
      'Contacto',
    ]);
  });

  test('la sección del chat dice qué se guarda y por cuánto tiempo', async ({ page }) => {
    await page.goto('/privacidad');

    // Los dos datos que un aviso de este tipo no puede omitir: que interviene un
    // tercero y cuánto dura la retención.
    const section = page.getByRole('main').getByText(/inteligencia artificial/);
    await expect(section).toContainText('90 días');
  });

  test('la URL del WordPress anterior sigue llegando al aviso', async ({ page }) => {
    // Se migra y no se redirige al home como el resto del blog: quien tenía el
    // aviso guardado debe seguir encontrándolo.
    await page.goto('/politicas-de-privacidad-xtt');

    await expect(page).toHaveURL(/\/privacidad$/);
    await expect(page.locator('h1')).toHaveText('Aviso de privacidad');
  });

  test('el enlace del formulario de contacto ya no es un 404', async ({ page }) => {
    await page.goto('/contacto');
    await page
      .getByRole('main')
      .getByRole('link', { name: /privacidad/i })
      .click();

    await expect(page).toHaveURL(/\/privacidad$/);
    await expect(page.locator('h1')).toHaveText('Aviso de privacidad');
  });

  test('el footer llega al aviso', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Aviso de privacidad' })
      .click();

    await expect(page).toHaveURL(/\/privacidad$/);
  });

  test('la versión en inglés advierte que la que rige es la española', async ({
    page,
  }) => {
    await page.goto('/en/privacy');
    await expect(
      page.getByText('The Spanish version is the one that governs'),
    ).toBeVisible();

    // En español ese aviso sobra: es el original, no una traducción.
    await page.goto('/privacidad');
    await expect(page.getByText('rige')).toHaveCount(0);
  });
});
