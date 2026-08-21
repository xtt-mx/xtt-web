import { expect, test } from '@playwright/test';

/**
 * El sistema de temas es la parte con más formas de romperse en silencio:
 * el flash sí se ve pero no falla ningún build, y un token mal definido solo
 * se nota si alguien abre el otro tema. De ahí que tenga su propio spec.
 */

test.describe('Tema claro / oscuro', () => {
  test('respeta prefers-color-scheme cuando no hay preferencia guardada', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    // Sin elección explícita no se estampa data-theme: manda el media query.
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 11, 11)');

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
  });

  test('el toggle cambia el tema y sobrevive a una recarga', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await page.getByRole('radio', { name: 'Claro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );

    // El SO sigue en oscuro: esto verifica que la elección explícita le gana.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('radio', { name: 'Claro' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('volver a "según el sistema" devuelve el control al SO', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await page.getByRole('radio', { name: 'Claro' }).click();
    await page.getByRole('radio', { name: 'Según el sistema' }).click();

    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 11, 11)');
  });

  test('no hay flash: el fondo ya es oscuro en el primer paint', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.getByRole('radio', { name: 'Oscuro' }).click();

    // Con el SO en claro y la preferencia en oscuro, solo el script inline puede
    // dejar `data-theme` puesto antes de que React hidrate.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('el azul base nunca se usa como color de texto en tema oscuro', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'Oscuro' }).click();

    // #0A2DFF sobre #0B0B0B da ~2.9:1. Solo vale como relleno con texto blanco.
    const offenders = await page.evaluate(() => {
      const bad = 'rgb(10, 45, 255)';
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          const style = getComputedStyle(el);
          const hasOwnText = [...el.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          );
          return hasOwnText && style.color === bad;
        })
        .map((el) => `${el.tagName}.${el.className}`);
    });

    expect(offenders).toEqual([]);
  });
});
