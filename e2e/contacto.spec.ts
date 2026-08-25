import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * El endpoint real reenvía a n8n, que en CI no existe. Se intercepta la ruta
 * para poder probar la UI —validación, foco, estados— sin depender de la red ni
 * mandar correos de prueba. Los caminos del servidor (honeypot, rate limit,
 * fallo de n8n) se cubren aparte, en `e2e/contacto-api.spec.ts`.
 *
 * Todos los locators de rol se acotan al `<form>`: Next monta un anunciador de
 * rutas con `role="alert"` dentro de un shadow DOM, y un `getByRole('alert')`
 * suelto lo resuelve junto con el nuestro.
 */

const fillValid = async (page: Page) => {
  await page.getByLabel('Nombre').fill('Kenneth Chinchilla');
  await page.getByLabel('Correo').fill('kenneth@ejemplo.com');
  await page
    .getByLabel('¿Qué necesitas?')
    .fill('Quiero información sobre troncales SIP para Guatemala y Costa Rica.');
};

test.describe('Formulario de contacto', () => {
  test('los campos opcionales se marcan como tales', async ({ page }) => {
    await page.goto('/contacto');

    await expect(page.getByLabel('Empresa (opcional)')).toBeVisible();
    await expect(page.getByLabel('País (opcional)')).toBeVisible();
    // Nombre y correo NO llevan la marca: son obligatorios.
    await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible();
  });

  test('enviar vacío muestra los errores y lleva el foco al resumen', async ({
    page,
  }) => {
    await page.goto('/contacto');
    await page.getByRole('button', { name: 'Enviar' }).click();

    const summary = page.locator('form').getByRole('alert');
    await expect(summary).toBeVisible();
    // Que el foco caiga aquí es lo que hace que un lector de pantalla lo anuncie.
    await expect(summary).toBeFocused();

    await expect(summary.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('el error no se comunica solo con color', async ({ page }) => {
    await page.goto('/contacto');
    await page.getByRole('button', { name: 'Enviar' }).click();

    // Además del borde rojo, el campo apunta a un texto que explica el error.
    const email = page.getByLabel('Correo');
    const describedBy = await email.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveText(
      'Revisa el formato del correo',
    );
  });

  test('el campo con error usa el token de error en ambos temas', async ({ page }) => {
    // Verifica de paso que los tokens `--color-danger` existen en los dos temas:
    // si alguien agrega un color de error solo al bloque claro, esto lo atrapa.
    for (const [scheme, expected] of [
      ['dark', 'rgb(240, 82, 82)'],
      ['light', 'rgb(200, 30, 30)'],
    ] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/contacto');
      await page.getByRole('button', { name: 'Enviar' }).click();

      const input = page.getByLabel('Nombre', { exact: true });
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(input).toHaveCSS('border-top-color', expected);
    }
  });

  test('un envío correcto muestra la confirmación', async ({ page }) => {
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 200, json: { ok: true } }),
    );

    await page.goto('/contacto');
    await fillValid(page);
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(page.getByRole('status')).toContainText('Mensaje enviado');
    // El formulario desaparece: no debe poder reenviarse por accidente.
    await expect(page.getByRole('button', { name: 'Enviar' })).toHaveCount(0);
  });

  test('si el envío falla NO se dice que se envió', async ({ page }) => {
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 502, json: { error: 'upstream' } }),
    );

    await page.goto('/contacto');
    await fillValid(page);
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(page.locator('form').getByRole('alert')).toContainText(
      'No pudimos enviar el mensaje',
    );
    await expect(page.getByRole('status')).toHaveCount(0);
    // El botón sigue ahí para reintentar.
    await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible();
  });

  test('el 429 explica que hay que esperar, no que falló', async ({ page }) => {
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 429, json: { error: 'rateLimited' } }),
    );

    await page.goto('/contacto');
    await fillValid(page);
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(page.locator('form').getByRole('alert')).toContainText(
      'Demasiados envíos',
    );
  });

  test('el honeypot está fuera de pantalla y del alcance del teclado', async ({
    page,
  }) => {
    await page.goto('/contacto');

    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');

    const box = await honeypot.boundingBox();
    expect(box?.x ?? 0).toBeLessThan(-1000);
  });

  test('los datos directos son enlaces accionables', async ({ page }) => {
    await page.goto('/contacto');

    // Acotado a <main>: el footer repite teléfono y correo en todas las páginas.
    const aside = page.getByRole('main');

    await expect(aside.getByRole('link', { name: '+52 81 8121 2614' })).toHaveAttribute(
      'href',
      'tel:+528181212614',
    );
    await expect(
      aside.getByRole('link', { name: 'contacto@xtt.com.mx' }),
    ).toHaveAttribute('href', 'mailto:contacto@xtt.com.mx');
  });
});
