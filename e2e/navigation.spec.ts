import { expect, test } from '@playwright/test';

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
    await expect(page.locator('h1')).toContainText('Cuatro soluciones');

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

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toContainText('Four solutions');

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

    await page.getByRole('button', { name: 'Español' }).click();
    await expect(page).toHaveURL(/\/nosotros$/);
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
