import { chatSchema } from '@/lib/chat-schema';
import { buildKnowledge, chatRules } from '@/lib/chat-knowledge';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/config/types';

/**
 * Recibe un turno del chat y lo reenvía al workflow de n8n.
 *
 * Mismo reparto de responsabilidades que `/api/contact`, y por la misma razón:
 * el navegador nunca habla con n8n directamente, porque hacerlo publicaría la
 * URL del webhook en el HTML y dejaría el endpoint abierto a cualquiera. Aquí
 * se valida, se limita, se arma el contexto y se firma.
 *
 * El orden de los pasos es el de contacto y es deliberado:
 *
 *   1. Rate limit  — lo más barato primero.
 *   2. Validación  — un cuerpo malformado es error del CLIENTE: 400 aunque el
 *                    servidor esté mal configurado.
 *   3. Configuración y reenvío.
 *
 * No hay trampas antispam: el chat no tiene campos ocultos que llenar ni un
 * tiempo mínimo de redacción que signifique algo. La defensa contra abuso es el
 * rate limit y los topes del esquema.
 */

/**
 * 12 mensajes por IP cada 5 minutos.
 *
 * Más estricto que el formulario (5 cada 10 min) en frecuencia pero más
 * permisivo en volumen, porque conversar son muchos turnos cortos seguidos. La
 * cubeta es propia y no compartida con contacto: un endpoint de LLM cuesta
 * dinero por petición y agotarlo no debería dejar a nadie sin poder escribir.
 */
const LIMIT = 12;
const WINDOW_MS = 5 * 60 * 1_000;

/**
 * Un modelo tarda más que un envío de Gmail. Es el único número que se aparta
 * de `/api/contact` (10 s) y por eso lleva comentario: con el tope de contacto,
 * una respuesta larga se cortaría a media generación y el visitante vería un
 * error donde no lo hubo.
 */
const UPSTREAM_TIMEOUT_MS = 30_000;

const json = (body: unknown, status: number, headers?: HeadersInit) =>
  Response.json(body, { status, headers });

const resolveLocale = (request: Request): Locale => {
  const header = request.headers.get('x-xtt-locale');
  return routing.locales.includes(header as Locale) ? (header as Locale) : 'es';
};

export const POST = async (request: Request) => {
  const limit = rateLimit(`chat:${clientKey(request)}`, {
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

  const parsed = chatSchema.safeParse(payload);
  if (!parsed.success) {
    // Claves de i18n por campo; el cliente las traduce. Igual que en contacto.
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return json({ error: 'validation', fields: fieldErrors }, 400);
  }

  const { message, history, sessionId } = parsed.data;

  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  // Sin configuración no se finge que funciona: es un fallo de despliegue.
  if (!webhookUrl || !webhookSecret) {
    console.error('[chat] falta N8N_CHAT_WEBHOOK_URL o N8N_WEBHOOK_SECRET');
    return json({ error: 'unavailable' }, 503);
  }

  const locale = resolveLocale(request);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // El mismo header que valida el nodo IF del workflow en n8n.
        'X-XTT-Signature': webhookSecret,
      },
      body: JSON.stringify({
        message,
        history,
        sessionId,
        locale,
        /**
         * El contexto viaja en cada turno en vez de vivir en el workflow: así
         * n8n no guarda una copia del contenido del sitio que envejece sola.
         */
        system: `${chatRules(locale)}\n\n${buildKnowledge(locale)}`,
        receivedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error('[chat] n8n respondió', response.status);
      return json({ error: 'upstream' }, 502);
    }

    const body = (await response.json().catch(() => null)) as { reply?: unknown } | null;
    const reply = typeof body?.reply === 'string' ? body.reply.trim() : '';

    /**
     * Un 200 con el cuerpo vacío es un fallo del workflow, no una respuesta.
     * Sin esta comprobación el widget pintaría una burbuja en blanco, que se lee
     * como que el bot no quiso contestar en vez de como el error que es.
     */
    if (!reply) {
      console.error('[chat] n8n respondió 200 sin `reply`');
      return json({ error: 'upstream' }, 502);
    }

    return json({ reply }, 200);
  } catch (error) {
    console.error('[chat] no se pudo alcanzar n8n', error);
    return json({ error: 'upstream' }, 502);
  }
};
