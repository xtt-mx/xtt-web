import { contactSchema, MIN_FILL_MS } from '@/lib/contact-schema';
import { clientKey, rateLimit } from '@/lib/rate-limit';

/**
 * Recibe el formulario de contacto y lo reenvía al workflow de n8n.
 *
 * El navegador NUNCA habla con n8n directamente. Postear al webhook desde el
 * cliente publicaría su URL en el HTML, obligaría a resolver CORS y dejaría el
 * endpoint abierto a cualquiera. Este handler es el que valida, limita y firma.
 */

/** 5 envíos por IP cada 10 minutos. Suficiente para corregir y reintentar. */
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1_000;

const json = (body: unknown, status: number, headers?: HeadersInit) =>
  Response.json(body, { status, headers });

export const POST = async (request: Request) => {
  const webhookUrl = process.env.N8N_CONTACT_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  // Sin configuración no se finge que funciona: es un fallo de despliegue y
  // debe verse como tal, no como "gracias, te contactamos pronto".
  if (!webhookUrl || !webhookSecret) {
    console.error('[contact] falta N8N_CONTACT_WEBHOOK_URL o N8N_WEBHOOK_SECRET');
    return json({ error: 'unavailable' }, 503);
  }

  const limit = rateLimit(`contact:${clientKey(request)}`, {
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limit.ok) {
    return json({ error: 'rateLimited' }, 429, {
      'Retry-After': String(limit.retryAfter),
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalidJson' }, 400);
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    // Se devuelven las claves de i18n por campo; el cliente las traduce.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return json({ error: 'validation', fields: fieldErrors }, 400);
  }

  const { website, startedAt, ...data } = parsed.data;

  /**
   * Honeypot relleno o envío demasiado rápido: es automatizado.
   *
   * Se responde 200 a propósito. Un 400 le enseña al bot qué lo delató y lo
   * invita a reintentar afinando; un 200 lo deja creer que funcionó y seguir su
   * camino. El mensaje simplemente no se envía a nadie.
   */
  const tooFast = Date.now() - startedAt < MIN_FILL_MS;
  if (website || tooFast) {
    console.warn('[contact] descartado', { honeypot: Boolean(website), tooFast });
    return json({ ok: true }, 200);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // El mismo header que valida el nodo IF del workflow en n8n.
        'X-XTT-Signature': webhookSecret,
      },
      body: JSON.stringify({
        ...data,
        receivedAt: new Date().toISOString(),
        locale: request.headers.get('x-xtt-locale') ?? 'es',
      }),
      // Sin tope, un n8n colgado dejaría la petición del usuario esperando
      // hasta que el navegador se rinda.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error('[contact] n8n respondió', response.status);
      return json({ error: 'upstream' }, 502);
    }

    return json({ ok: true }, 200);
  } catch (error) {
    console.error('[contact] no se pudo alcanzar n8n', error);
    return json({ error: 'upstream' }, 502);
  }
};
