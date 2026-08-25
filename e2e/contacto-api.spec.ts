import { expect, test } from '@playwright/test';

/**
 * Contrato del endpoint `/api/contact`, sin pasar por la UI.
 *
 * En CI no hay `N8N_CONTACT_WEBHOOK_URL`, así que el endpoint responde 503 y ese
 * es justamente el caso que más importa verificar: **sin configuración no puede
 * fingir que funcionó**. Un formulario que dice "enviado" cuando nada se envió
 * pierde leads en silencio, y es el fallo que nadie detecta hasta que alguien
 * reclama que nunca le contestaron.
 *
 * Cada test manda un `X-Forwarded-For` distinto. Sin eso todos comparten cubeta
 * de rate limit —Playwright sale por la misma IP— y a partir del sexto request
 * la suite se cae con 429 en vez de probar lo que dice probar. De paso ejercita
 * `clientKey`, que es como el endpoint lee la IP real detrás de Caddy.
 */

/**
 * IP nueva en cada llamada. Es aleatoria y no un contador porque el archivo se
 * ejecuta una vez por proyecto de Playwright (escritorio y móvil): un contador
 * genera la misma secuencia en ambos y el segundo proyecto se encuentra las
 * cubetas ya gastadas por el primero.
 *
 * 203.0.113.0/24 es el rango TEST-NET-3 del RFC 5737, reservado justo para esto.
 */
const freshIp = (): Record<string, string> => ({
  'X-Forwarded-For': `203.0.113.${Math.floor(Math.random() * 254) + 1}:${Math.random()}`,
});

const validBody = () => ({
  name: 'Kenneth Chinchilla',
  email: 'kenneth@ejemplo.com',
  message: 'Quiero información sobre troncales SIP para Guatemala y Costa Rica.',
  // 60 s atrás, para pasar el mínimo de tiempo de llenado.
  startedAt: Date.now() - 60_000,
});

const isConfigured = (status: number) => status !== 503;

test.describe('POST /api/contact', () => {
  test('sin webhook configurado responde 503, nunca un falso éxito', async ({
    request,
  }) => {
    const response = await request.post('/api/contact', {
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

  test('rechaza el correo mal formado con la clave de i18n', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: freshIp(),
      data: { ...validBody(), email: 'no-es-correo' },
    });

    // La validación corre antes de tocar la configuración de n8n.
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'validation',
      fields: { email: 'invalidEmail' },
    });
  });

  test('rechaza el mensaje demasiado corto', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: freshIp(),
      data: { ...validBody(), message: 'hola' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ fields: { message: 'tooShort' } });
  });

  test('el cuerpo que no es JSON no revienta el endpoint', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: { 'Content-Type': 'application/json', ...freshIp() },
      data: 'esto no es json',
    });

    expect(response.status()).toBe(400);
  });

  test('el honeypot no le dice al bot qué lo delató', async ({ request }) => {
    const response = await request.post('/api/contact', {
      headers: freshIp(),
      data: { ...validBody(), website: 'http://spam.example' },
    });

    if (!isConfigured(response.status())) {
      test.skip(true, 'Requiere webhook configurado para distinguir 200 de 503');
      return;
    }

    // 200 a propósito: un 400 le enseñaría al bot a afinar el siguiente intento.
    // El mensaje simplemente no se reenvía a n8n.
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

test.describe('Rate limit', () => {
  test('corta al sexto intento desde la misma IP y dice cuándo reintentar', async ({
    request,
  }) => {
    // Una IP fija para este test, pero única entre proyectos por el sufijo.
    const headers = { 'X-Forwarded-For': `198.51.100.77:${Math.random()}` };
    const statuses: number[] = [];

    for (let i = 0; i < 6; i += 1) {
      const response = await request.post('/api/contact', {
        headers,
        data: { ...validBody(), email: 'no-es-correo' },
      });
      statuses.push(response.status());

      if (response.status() === 429) {
        // Sin `Retry-After` el cliente no sabe si esperar 5 segundos o una hora.
        expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0);
      }
    }

    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses[5]).toBe(429);
  });
});
