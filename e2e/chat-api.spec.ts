import { expect, test } from '@playwright/test';

import { MAX_HISTORY, MAX_MESSAGE_CHARS } from '../src/lib/chat-schema';

/**
 * Contrato de `/api/chat`, sin pasar por la UI y sin gastar un token de OpenAI.
 *
 * En CI no hay `N8N_CHAT_WEBHOOK_URL`, así que el endpoint responde 503, y ese
 * es el caso que más importa fijar: **sin configuración no puede fingir que
 * contestó**. Un chat que responde algo plausible cuando su backend está caído
 * es peor que uno que no responde, porque nadie se entera de que está roto.
 *
 * Los topes se prueban aquí y no en la UI porque la UI ya los impide —el `input`
 * lleva `maxLength` y el botón se deshabilita en vacío—, y esa es exactamente la
 * razón por la que el servidor tiene que comprobarlos por su cuenta: quien
 * quiera abusar del endpoint no va a usar el formulario.
 */

/**
 * IP nueva en cada llamada, con el mismo criterio que `contacto-api.spec.ts`:
 * aleatoria y no un contador, porque el archivo corre una vez por proyecto de
 * Playwright y un contador reproduce la misma secuencia en los dos.
 */
const freshIp = (): Record<string, string> => ({
  'X-Forwarded-For': `203.0.113.${Math.floor(Math.random() * 254) + 1}:${Math.random()}`,
});

const validBody = () => ({
  message: '¿En qué países opera XTT?',
  history: [],
  sessionId: '3f7c1d2e-9b8a-4c6d-8e1f-2a4b6c8d0e2f',
});

const isConfigured = (status: number) => status !== 503;

test.describe('POST /api/chat', () => {
  test('sin webhook configurado responde 503, nunca una respuesta inventada', async ({
    request,
  }) => {
    const response = await request.post('/api/chat', {
      headers: freshIp(),
      data: validBody(),
    });

    if (isConfigured(response.status())) {
      test.skip(true, 'Hay webhook configurado; este caso solo aplica sin él');
      return;
    }

    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: 'unavailable' });
  });

  test('rechaza el mensaje vacío antes de mirar la configuración', async ({
    request,
  }) => {
    const response = await request.post('/api/chat', {
      headers: freshIp(),
      data: { ...validBody(), message: '   ' },
    });

    // 400 y no 503: un cuerpo malformado es error del cliente aunque el servidor
    // esté sin configurar. Culpar al servidor de un error del cliente manda a
    // buscar el fallo al sitio equivocado.
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'validation',
      fields: { message: 'required' },
    });
  });

  /**
   * El tope existe por dinero, no por estilo: cada carácter se paga en tokens y
   * un campo sin límite es una invitación a pegar un libro para vaciar el saldo.
   */
  test('rechaza el mensaje que pasa el tope de caracteres', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: freshIp(),
      data: { ...validBody(), message: 'a'.repeat(MAX_MESSAGE_CHARS + 1) },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ fields: { message: 'tooLong' } });
  });

  /**
   * El historial lo manda el cliente, así que el servidor no puede confiar en su
   * tamaño: sin tope, cualquiera infla el prompt tanto como quiera.
   */
  test('rechaza un historial más largo que el tope', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: freshIp(),
      data: {
        ...validBody(),
        history: Array.from({ length: MAX_HISTORY + 1 }, () => ({
          role: 'user',
          content: 'relleno',
        })),
      },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ fields: { history: 'tooLong' } });
  });

  test('rechaza un sessionId que no es un UUID', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: freshIp(),
      data: { ...validBody(), sessionId: 'a-mano' },
    });

    expect(response.status()).toBe(400);
  });

  test('el cuerpo que no es JSON no revienta el endpoint', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: { 'Content-Type': 'application/json', ...freshIp() },
      data: 'esto no es json',
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Rate limit del chat', () => {
  test('corta al mensaje 13 desde la misma IP y dice cuándo reintentar', async ({
    request,
  }) => {
    // IP fija para este test, única entre proyectos por el sufijo aleatorio.
    const headers = { 'X-Forwarded-For': `198.51.100.42:${Math.random()}` };
    const statuses: number[] = [];

    // Cuerpo inválido a propósito: interesa contar peticiones, no llegar a n8n.
    for (let i = 0; i < 13; i += 1) {
      const response = await request.post('/api/chat', {
        headers,
        data: { ...validBody(), message: '' },
      });
      statuses.push(response.status());

      if (response.status() === 429) {
        expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0);
      }
    }

    expect(statuses.slice(0, 12)).toEqual(Array.from({ length: 12 }, () => 400));
    expect(statuses[12]).toBe(429);
  });
});
