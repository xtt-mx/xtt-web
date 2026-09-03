/**
 * Configuración del asistente de chat.
 *
 * Solo lo estructural: la copy vive en `messages/{es,en}.json` bajo `chat`, los
 * topes de mensaje e historial en `src/lib/chat-schema.ts` y el corpus en
 * `src/lib/chat-knowledge.ts`.
 */

/**
 * ¿Se monta el chat en el sitio?
 *
 * Es `NEXT_PUBLIC_` y no una comprobación de `N8N_CHAT_WEBHOOK_URL` porque el
 * layout se prerenderiza en build: una variable que solo existe en runtime se
 * leería como ausente al generar el HTML y el widget no llegaría a la página.
 * El prefijo deja explícito que el valor se inlinea en el build.
 *
 * Son dos preguntas distintas y conviene que tengan dos respuestas: si la
 * interfaz debe existir (build, esto) y si puede funcionar (runtime, lo resuelve
 * `/api/chat` respondiendo 503 sin webhook configurado).
 *
 * Gobierna también la sección del chat en el aviso de privacidad: el aviso
 * describe el chat solo mientras el chat exista, y los dos se encienden juntos.
 */
export const isChatEnabled = process.env.NEXT_PUBLIC_CHAT_ENABLED === 'true';

/**
 * Días que se conservan las transcripciones. Lo aplica el workflow de limpieza
 * en n8n, no este código; aquí vive porque es el número que cita el aviso de
 * privacidad y los dos no pueden decir cosas distintas.
 */
export const CHAT_RETENTION_DAYS = 90;
