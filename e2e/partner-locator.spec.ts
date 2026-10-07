import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import es from '../messages/es.json';
import { coveredCountries } from '../src/config/presence';
import { solutions } from '../src/config/solutions';

/**
 * El aviso del estado vacío se lee de `messages/es.json` y no se escribe aquí a
 * mano. Con el literal, cada ronda de revisión de copy en ClickUp rompía un test
 * que no habla de copy —pasó con «Todavía» → «Aún»— y la reacción natural es
 * revertir el texto en vez de arreglar el test. Es el mismo criterio que ya
 * sigue `navigation.spec.ts` con el titular del hero.
 */

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

    await expect(main.getByText(es.partnerLocator.empty)).toBeVisible();

    // La salida importa tanto como el aviso: sin ella el visitante que sí quiere
    // un partner se queda sin siguiente paso.
    await expect(
      main.getByRole('link', { name: es.partnerLocator.emptyCta }),
    ).toHaveAttribute('href', '/contacto');
  });

  test('los filtros ofrecen toda la cobertura, no solo los países con partner', async ({
    page,
  }) => {
    await page.goto('/partner-locator');

    // Todos los países cubiertos + "Todos". El número sale de la configuración y
    // no escrito a mano: dar de alta o de baja un país es una decisión comercial
    // que no tiene por qué romper un test sobre los filtros. Ya pasó con la baja
    // de Trinidad y Tobago.
    //
    // Lo que de verdad se prueba es que el filtro se alimenta de la COBERTURA y
    // no de `partners` —hoy vacío—, que lo dejaría con una sola opción.
    await expect(page.getByLabel('País').locator('option')).toHaveCount(
      coveredCountries.length + 1,
    );
    await expect(page.getByLabel('Solución').locator('option')).toHaveCount(
      solutions.length + 1,
    );
  });

  test('filtrar no rompe la página ni miente sobre el resultado', async ({ page }) => {
    await page.goto('/partner-locator');
    const main = page.getByRole('main');

    await page.getByLabel('País').selectOption('CR');
    await page.getByLabel('Solución').selectOption('ccaas');

    // Con el directorio vacío cualquier combinación da cero. Lo que este test
    // llama "mentir" es quedarse con el número anterior, y eso se comprueba
    // igual: el contador DESAPARECE en vez de decir «Sin partners» encima del
    // bloque que ya explica el cero y además ofrece salida.
    await expect(main.getByText('Sin partners')).toHaveCount(0);
    await expect(main.getByText(es.partnerLocator.empty)).toBeVisible();
  });

  test('la cobertura no repite el país cuando la región es ese país', async ({
    page,
  }) => {
    await page.goto('/partner-locator');

    // Se acota a la sección de cobertura: los nombres de país salen también en
    // los `<option>` del filtro, y un locator sobre `main` mide las dos cosas.
    const presence = page.getByRole('region', { name: 'Dónde operamos' });

    await expect(presence.getByText(es.presence.countries.GT)).toBeVisible();
    await expect(presence.getByText(es.presence.countries.DO)).toBeVisible();

    // "México" aparece una vez: la región se llama igual que el país, así que
    // repetirlo debajo no informaría nada.
    await expect(presence.getByText('México', { exact: true })).toHaveCount(1);

    // «Sudamérica» es el caso contrario, y es el que de verdad hay que vigilar:
    // la región NO se llama como su país, así que Colombia tiene que aparecer
    // debajo. Sin eso el sitio nombraría un continente sin decir dónde opera.
    // `exact` porque el párrafo de entrada también dice «Sudamérica», y sin él
    // el locator caza dos elementos.
    await expect(
      presence.getByText(es.presence.regions.sudamerica, { exact: true }),
    ).toBeVisible();
    await expect(
      presence.getByText(es.presence.countries.CO, { exact: true }),
    ).toHaveCount(1);
  });
});

/**
 * El mapa va `aria-hidden` a propósito —ver `src/components/CoverageMap.tsx`—,
 * así que aquí no sirven los locators por rol. Los países se buscan por
 * `data-country`, que es su única identidad en el DOM.
 */
test.describe('Mapa de cobertura', () => {
  const pais = (page: Page, code: string) => page.locator(`[data-country="${code}"]`);

  test('dibuja un país por cada uno de la cobertura', async ({ page }) => {
    await page.goto('/partner-locator');

    // El número sale de la configuración, igual que en los filtros: dar de alta
    // un país no debe obligar a tocar este test.
    await expect(page.locator('[data-country]')).toHaveCount(coveredCountries.length);
  });

  test('pulsar un país filtra, y el desplegable lo refleja', async ({ page }) => {
    await page.goto('/partner-locator');

    await pais(page, 'CR').click();

    // Lo que importa no es que el país se pinte, sino que el mapa y el
    // desplegable no puedan contradecirse: comparten un solo estado.
    await expect(page.getByLabel('País')).toHaveValue('CR');
  });

  test('cambiar el desplegable marca el país en el mapa', async ({ page }) => {
    await page.goto('/partner-locator');

    await page.getByLabel('País').selectOption('JM');

    // La clase lleva el hash de CSS Modules, así que se compara por contenido.
    await expect(pais(page, 'JM')).toHaveClass(/selected/);
    await expect(pais(page, 'CR')).not.toHaveClass(/selected/);
  });

  test('volver a pulsar el país elegido lo deselecciona', async ({ page }) => {
    await page.goto('/partner-locator');

    await pais(page, 'MX').click();
    await expect(page.getByLabel('País')).toHaveValue('MX');

    await pais(page, 'MX').click();
    await expect(page.getByLabel('País')).toHaveValue('all');
    await expect(pais(page, 'MX')).not.toHaveClass(/selected/);
  });

  test('no se interpone en el recorrido con teclado', async ({ page }) => {
    await page.goto('/partner-locator');

    // Doce `<path>` enfocables entre el encabezado y los filtros harían del
    // teclado un castigo. El desplegable es el control accesible; el mapa es un
    // atajo para el ratón y debe ser invisible para el foco.
    await expect(page.locator('[data-country][tabindex]')).toHaveCount(0);
    await expect(page.locator('svg[aria-hidden="true"] [data-country]')).toHaveCount(
      coveredCountries.length,
    );
  });
});
