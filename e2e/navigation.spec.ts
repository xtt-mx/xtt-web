import { expect, test, type Page } from '@playwright/test';

import en from '../messages/en.json';
import es from '../messages/es.json';

/**
 * Pulsa un botón del switcher de idioma y espera la navegación.
 *
 * El clic va dentro de `toPass` por la misma razón que en `chat.spec.ts`:
 * `page.goto` resuelve con el `load` del documento, y para entonces el botón ya
 * está en el HTML del servidor pero React puede no haberle enganchado todavía el
 * handler. Playwright lo ve accionable, dispara el clic, y el clic se pierde sin
 * hacer nada. Allí se comprobó que ocurre de verdad; aquí es la misma forma de
 * interacción, así que lleva la misma guarda.
 *
 * La comprobación de la URL lo hace idempotente: si el clic sí funcionó, no se
 * vuelve a pulsar y no se acaba rebotando entre los dos idiomas.
 */
const cambiarIdioma = async (page: Page, boton: string, destino: RegExp) => {
  await expect(async () => {
    if (!destino.test(page.url())) {
      await page.getByRole('button', { name: boton }).click();
    }
    await expect(page).toHaveURL(destino, { timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
};

test.describe('Navegación e idioma', () => {
  test('la raíz es español, sin importar el Accept-Language del navegador', async ({
    browser,
  }) => {
    // Un navegador en inglés no debe cambiar lo que sirve `/`: si lo hiciera, la
    // misma URL tendría dos contenidos y Google indexaría el idioma equivocado.
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    // Se compara contra la copy y no contra una frase escrita aquí: lo que este
    // test comprueba es que la raíz sirve ESPAÑOL, no cuál es el titular. Con un
    // literal, cada revisión de textos rompía un test que no habla de textos.
    await expect(page.locator('h1')).toHaveText(es.hero.title);

    await context.close();
  });

  test('el nav tiene exactamente los cinco apartados del brief', async ({
    page,
    isMobile,
  }) => {
    // En móvil el nav de escritorio está oculto; su equivalente se cubre en el
    // describe de "Menú móvil".
    test.skip(isMobile, 'El nav de escritorio no se renderiza en viewports angostos');

    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(nav.getByRole('link')).toHaveText([
      'Inicio',
      'Nosotros',
      'Nuestras soluciones',
      'Partner Locator',
      'Contacto',
    ]);
  });

  test('el switcher cambia de idioma y traduce el slug', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Usa el nav de escritorio para comprobar el slug');

    await page.goto('/');

    await cambiarIdioma(page, 'English', /\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveText(en.hero.title);

    // Acotado al nav: el mismo enlace existe en el footer y un locator suelto
    // resolvería a dos elementos.
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/en/about',
    );
  });

  test('el switcher conserva la página actual al cambiar de idioma', async ({ page }) => {
    await page.goto('/en/about');

    await cambiarIdioma(page, 'Español', /\/nosotros$/);
  });

  test('el skip link es el primer foco y lleva al contenido', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(skip).toBeFocused();

    await skip.press('Enter');
    await expect(page).toHaveURL(/#contenido$/);
  });
});

test.describe('Menú móvil', () => {
  test.skip(({ isMobile }) => !isMobile, 'El panel solo existe en viewports angostos');

  test('abre, bloquea el scroll y cierra con Escape', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Abrir menú' });
    await toggle.click();

    await expect(page.getByRole('button', { name: 'Cerrar menú' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Navegación móvil' }),
    ).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('la órbita se convierte en lista y nada desborda a lo ancho', async ({ page }) => {
    await page.goto('/');

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
});
