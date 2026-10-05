import { expect, test, type Page } from '@playwright/test';

/**
 * El widget del chat contra un `/api/chat` interceptado.
 *
 * Nada aquí sale a la red: cada test decide qué contesta el endpoint. Así la
 * suite no depende de que n8n esté arriba, no gasta tokens de OpenAI y —lo que
 * de verdad importa— puede provocar el fallo del backend a voluntad, que es el
 * caso que no se puede reproducir a mano cuando todo funciona.
 *
 * Corre con `NEXT_PUBLIC_CHAT_ENABLED=true`, que la config de Playwright fija
 * aunque en producción siga apagado a la espera del aviso de privacidad.
 */

const REPLY = 'XTT opera en México, Centroamérica, el Caribe y Colombia.';

/**
 * Abre el panel y devuelve su locator.
 *
 * El clic va dentro de `toPass` por una carrera de hidratación: `page.goto`
 * resuelve con el `load` del documento, y para entonces el botón ya está en el
 * HTML del servidor pero React todavía no le ha enganchado el handler.
 * Playwright lo ve accionable, dispara el clic, y el clic no hace nada. Sin el
 * reintento la suite pasa en local y falla en cuanto la máquina va cargada, que
 * es la peor forma de fallar: intermitente y siempre en otro test.
 *
 * La guarda de `isHidden` lo hace idempotente. Sin ella, un reintento tras un
 * clic que sí funcionó volvería a pulsar y cerraría el panel.
 */
const reveal = async (page: Page, label = 'Abrir el chat') => {
  const panel = page.getByRole('dialog');

  await expect(async () => {
    if (await panel.isHidden()) {
      await page.getByRole('button', { name: label }).click();
    }
    await expect(panel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  return panel;
};

const open = async (page: Page, path = '/', label = 'Abrir el chat') => {
  await page.goto(path);
  return reveal(page, label);
};

const ask = async (page: Page, text: string) => {
  await page.getByRole('dialog').getByRole('textbox').fill(text);
  await page.getByRole('button', { name: 'Enviar pregunta' }).click();
};

const reply = (page: Page, status: number, body: unknown) =>
  page.route('**/api/chat', (route) => route.fulfill({ status, json: body }));

test.describe('Widget de chat', () => {
  test('la burbuja abre el panel y deja el cursor listo para escribir', async ({
    page,
  }) => {
    await page.goto('/');

    const bubble = page.getByRole('button', { name: 'Abrir el chat' });
    await expect(bubble).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('dialog')).toBeHidden();

    const panel = await reveal(page);

    await expect(panel).toBeVisible();
    // Por `aria-controls` y no por nombre: en móvil la burbuja se oculta con el
    // panel abierto y hay un segundo botón que también se llama "Cerrar el
    // chat" —la X de la cabecera—, así que el nombre no identifica al
    // disparador. La relación ARIA sí, y en los dos viewports.
    await expect(page.locator('[aria-controls="chat-panel"]')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // Abrir un chat y tener que hacer clic otra vez para escribir es una
    // interacción de más en el único gesto que importa.
    await expect(panel.getByRole('textbox')).toBeFocused();
  });

  /**
   * El panel no atrapa el foco —no es modal, la página sigue siendo usable
   * detrás—, pero sí tiene que devolverlo. Cerrar con Escape y que el foco caiga
   * al principio del documento deja a quien navega con teclado sin referencia de
   * dónde estaba.
   */
  test('Escape cierra y devuelve el foco a la burbuja', async ({ page }) => {
    await open(page);
    await page.keyboard.press('Escape');

    const bubble = page.getByRole('button', { name: 'Abrir el chat' });
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(bubble).toBeFocused();
    await expect(bubble).toHaveAttribute('aria-expanded', 'false');
  });

  test('la pregunta y la respuesta quedan en el hilo', async ({ page }) => {
    await reply(page, 200, { reply: REPLY });
    const panel = await open(page);

    await ask(page, '¿En qué países operan?');

    await expect(panel.getByText('¿En qué países operan?')).toBeVisible();
    await expect(panel.getByText(REPLY)).toBeVisible();
    // El campo se vacía: si no, la siguiente pregunta se escribe encima.
    await expect(panel.getByRole('textbox')).toHaveValue('');
  });

  /**
   * El caso que justifica todo el diseño del endpoint. Cuando n8n falla, el
   * widget dice que falló; no pinta una burbuja del bot con un texto de
   * disculpa, porque dentro del hilo se lee como algo que el bot contestó y
   * quien lo lee se queda pensando que el asistente no supo la respuesta.
   */
  test('si el backend falla lo dice, y no finge una respuesta del bot', async ({
    page,
  }) => {
    await reply(page, 502, { error: 'upstream' });
    const panel = await open(page);

    const log = panel.getByRole('log');
    const before = await log.locator('p').count();

    await ask(page, '¿Tienen cobertura en Perú?');

    await expect(panel.getByRole('alert')).toBeVisible();
    await expect(panel.getByRole('alert')).toContainText('No pude responder');

    // El hilo crece solo con la pregunta de la persona: ni una burbuja más.
    await expect(log.locator('p')).toHaveCount(before + 1);
    await expect(panel.getByText('¿Tienen cobertura en Perú?')).toBeVisible();
  });

  test('el 429 se distingue del fallo genérico', async ({ page }) => {
    await reply(page, 429, { error: 'rateLimited' });
    const panel = await open(page);

    await ask(page, 'hola');

    // "Espera un momento" y "algo se rompió" piden cosas distintas de quien lee.
    await expect(panel.getByRole('alert')).toContainText('Demasiados mensajes');
  });

  test('sin configurar, el chat lo admite en vez de quedarse mudo', async ({ page }) => {
    await reply(page, 503, { error: 'unavailable' });
    const panel = await open(page);

    await ask(page, 'hola');

    await expect(panel.getByRole('alert')).toContainText('no está disponible');
  });

  /**
   * El enlace al formulario está siempre, no aparece según lo que conteste el
   * modelo: decidir la UI parseando texto generado es lo primero que se rompe.
   */
  test('siempre hay salida al formulario, sin haber preguntado nada', async ({
    page,
  }) => {
    const panel = await open(page);

    const link = panel.getByRole('link', { name: 'Hablar con el equipo' });
    await expect(link).toBeVisible();

    await link.click();
    // `waitForURL` y no `toHaveURL`: la navegación es del lado del cliente y
    // espera al payload RSC de /contacto, que con la suite entera en paralelo
    // pasa de los 5 s por defecto de `expect`.
    await page.waitForURL(/\/contacto$/);
    // Cerrar al navegar importa en móvil, donde el panel tapa la pantalla entera
    // y dejaría el formulario debajo.
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('avisa de que las respuestas son generadas con IA', async ({ page }) => {
    const panel = await open(page);
    await expect(panel.getByText(/generadas con IA/)).toBeVisible();
  });

  test('el botón de enviar no se puede pulsar en vacío', async ({ page }) => {
    const panel = await open(page);
    const send = page.getByRole('button', { name: 'Enviar pregunta' });

    await expect(send).toBeDisabled();

    await panel.getByRole('textbox').fill('   ');
    await expect(send).toBeDisabled();

    await panel.getByRole('textbox').fill('hola');
    await expect(send).toBeEnabled();
  });
});

test.describe('Chat en móvil', () => {
  test.skip(
    ({ isMobile }) => !isMobile,
    'El panel solo ocupa la pantalla en viewports angostos',
  );

  /**
   * Con el panel a pantalla completa la burbuja sobra: cerrar es la X de la
   * cabecera. Se comprueba contando los botones que se llaman "Cerrar el chat",
   * que son dos en escritorio —la X y la burbuja— y uno aquí.
   */
  test('la burbuja se quita de en medio y cerrar sigue siendo posible', async ({
    page,
  }) => {
    const panel = await open(page);
    const closers = page.getByRole('button', { name: 'Cerrar el chat' });

    await expect(closers).toHaveCount(1);

    // El fondo no se puede mover mientras el panel tapa la pantalla.
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await closers.click();
    await expect(panel).toBeHidden();

    // Y al cerrar vuelve a existir, con el foco encima: ocultarla no puede
    // dejar a quien navega con teclado sin punto de retorno.
    const bubble = page.getByRole('button', { name: 'Abrir el chat' });
    await expect(bubble).toBeVisible();
    await expect(bubble).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });
});

test.describe('Chat en inglés', () => {
  test('el widget habla el idioma de la página', async ({ page }) => {
    const panel = await open(page, '/en', 'Open the chat');

    await expect(panel.getByRole('link', { name: 'Talk to the team' })).toBeVisible();
    await expect(panel.getByText(/AI-generated/)).toBeVisible();
  });
});
