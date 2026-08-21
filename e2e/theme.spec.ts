import { expect, test } from '@playwright/test';

/**
 * El sistema de temas es la parte con más formas de romperse en silencio:
 * el flash sí se ve pero no falla ningún build, y un token mal definido solo
 * se nota si alguien abre el otro tema. De ahí que tenga su propio spec.
 */

const BLACK = 'rgb(11, 11, 11)';
const WHITE = 'rgb(255, 255, 255)';

test.describe('Tema claro / oscuro', () => {
  test('respeta prefers-color-scheme cuando no hay preferencia guardada', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    // Sin elección explícita no se estampa data-theme: manda el media query.
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(page.locator('body')).toHaveCSS('background-color', BLACK);

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('body')).toHaveCSS('background-color', WHITE);
  });

  test('un clic alterna el tema y la elección sobrevive a una recarga', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveCSS('background-color', WHITE);

    // El SO sigue en oscuro: esto verifica que la elección explícita le gana.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveCSS('background-color', WHITE);
  });

  test('alterna en las dos direcciones', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Cambiar tema' });

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('el icono visible corresponde al tema destino', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const toggle = page.getByRole('button', { name: 'Cambiar tema' });
    // En claro se ofrece ir a oscuro: se ve la luna, no el sol.
    // Se asertan los `data-icon` y no las clases: las de CSS Modules se hashean
    // distinto entre dev y prod, y las de lucide cambian entre versiones.
    const iconShown = () =>
      toggle.evaluate((button) =>
        [...button.querySelectorAll<SVGElement>('[data-icon]')]
          .filter((svg) => getComputedStyle(svg).display !== 'none')
          .map((svg) => svg.dataset.icon)
          .join(),
      );

    expect(await iconShown()).toBe('moon');

    await toggle.click();
    expect(await iconShown()).toBe('sun');
  });

  test('no hay flash: el fondo ya es oscuro en el primer paint', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    // Con el SO en oscuro, un clic deja la preferencia explícita en "light";
    // un segundo clic la deja en "dark".
    const toggle = page.getByRole('button', { name: 'Cambiar tema' });
    await toggle.click();
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Con el SO en claro y la preferencia en oscuro, solo el script inline puede
    // dejar `data-theme` puesto antes de que React hidrate.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('el azul base nunca se usa como color de texto en tema oscuro', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

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

test.describe('Logotipo', () => {
  test('se pinta con el color de texto del tema en ambos modos', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const logo = page.getByRole('img', { name: 'XTT' }).first();

    // La máscara toma el color de `currentColor`, así que el logo es negro en
    // claro y blanco en oscuro sin cargar dos archivos.
    await expect(logo).toHaveCSS('background-color', BLACK);

    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(logo).toHaveCSS('background-color', WHITE);
  });

  test('el asset de la máscara existe y es vectorial', async ({ page }) => {
    const response = await page.request.get('/logo-xtt.svg');
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toContain('<path');
    // Un `<image>` significaría que volvimos a un raster disfrazado de SVG.
    expect(body).not.toContain('<image');
  });
});
