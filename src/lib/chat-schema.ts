import { z } from 'zod';

/**
 * Esquema del chat, compartido por el widget y el endpoint.
 *
 * Mismo criterio que `contact-schema.ts`: una sola definición para los dos
 * lados, y los mensajes son CLAVES de i18n porque el servidor no sabe en qué
 * idioma está el visitante.
 */

/**
 * Tope por mensaje. No es una regla de estilo: cada carácter que entra aquí se
 * paga en tokens, y un campo de texto sin tope es una invitación a que alguien
 * pegue un libro para vaciar el saldo de la API.
 */
export const MAX_MESSAGE_CHARS = 800;

/**
 * Turnos de historial que viajan en cada petición.
 *
 * El historial lo manda el CLIENTE y no lo guarda el servidor. Así el endpoint
 * no tiene estado —sobrevive a reinicios del contenedor y a que n8n se reinicie
 * a media conversación— y no hace falta el nodo Simple Memory de n8n, cuyo
 * estado también vive en memoria y se pierde igual.
 *
 * El costo asumido es que un cliente puede falsificar turnos previos. Con un bot
 * de solo lectura, sin herramientas y sobre contenido público, lo peor que
 * consigue es que su propio navegador muestre algo raro. El tope de turnos y el
 * de caracteres acotan lo que puede meter en el prompt.
 */
export const MAX_HISTORY = 12;

export const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'required').max(MAX_MESSAGE_CHARS, 'tooLong'),
  history: z.array(chatTurnSchema).max(MAX_HISTORY, 'tooLong').default([]),

  /**
   * Identificador de conversación. Lo genera el navegador y vive en
   * `sessionStorage`, no en una cookie: muere al cerrar la pestaña y no permite
   * seguir a nadie entre visitas. Sirve para agrupar los turnos de una misma
   * conversación en el Data Table, nada más.
   */
  sessionId: z.uuid(),
});

export type ChatTurn = z.infer<typeof chatTurnSchema>;
export type ChatInput = z.infer<typeof chatSchema>;

/** Lo único que el usuario ve y puede corregir. El resto lo pone el widget. */
export const VISIBLE_CHAT_FIELDS = [
  'message',
] as const satisfies readonly (keyof ChatInput)[];

export type VisibleChatField = (typeof VISIBLE_CHAT_FIELDS)[number];

/**
 * Recorta el historial a los últimos turnos.
 *
 * Es función pura y exportada para poder probarla: el widget la usa antes de
 * enviar y, si se equivoca, el endpoint responde 400 y la conversación se rompe
 * justo cuando se pone larga —es decir, cuando ya invertiste en ella—. Ese es el
 * momento en que menos se quiere descubrir el fallo.
 */
export const trimHistory = (turns: readonly ChatTurn[]): ChatTurn[] =>
  turns.slice(-MAX_HISTORY);
