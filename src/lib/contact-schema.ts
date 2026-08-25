import { z } from 'zod';

/**
 * Esquema del formulario de contacto, compartido por el cliente y el endpoint.
 *
 * Una sola definición a propósito: si la validación del navegador y la del
 * servidor se escriben por separado, divergen, y el usuario acaba viendo un
 * formulario que se ve válido y un 400 al enviarlo.
 *
 * Los mensajes son CLAVES de i18n, no texto: el servidor no sabe en qué idioma
 * está el visitante, así que devuelve la clave y el cliente la traduce.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'required').max(120),
  email: z.email('invalidEmail').max(200),
  company: z.string().trim().max(160).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  message: z.string().trim().min(20, 'tooShort').max(4_000),

  /**
   * Trampa para bots: campo oculto por CSS que una persona nunca ve ni llena.
   * Si viene con contenido, es automatizado.
   *
   * El esquema lo acepta A PROPÓSITO —solo acota el tamaño— y es el handler
   * quien decide qué hacer. Si se validara aquí con `.max(0)`, el envío del bot
   * recibiría un 400 diciéndole exactamente qué campo lo delató, que es la
   * información que no queremos darle.
   */
  website: z.string().max(200).optional(),

  /**
   * Momento en que se montó el formulario. Un envío en menos de unos segundos
   * no lo hizo una persona escribiendo 20 caracteres de mensaje.
   */
  startedAt: z.number().int().positive(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Milisegundos mínimos entre que se abre el formulario y se envía. */
export const MIN_FILL_MS = 3_000;

/**
 * ¿El formulario se llenó demasiado rápido para que lo hiciera una persona?
 *
 * Es una función y no una resta suelta en el handler porque el caso que importa
 * no se puede observar desde fuera del endpoint: un envío descartado responde
 * `200` igual que uno enviado —a propósito, para no darle pistas al bot—, así
 * que una prueba de extremo a extremo no distingue uno de otro. Aquí sí.
 *
 * `startedAt` viene del reloj del navegador. Si va adelantado respecto al del
 * servidor, el intervalo sale negativo; la versión ingenua `elapsed < MIN` lo
 * tomaba por bot y descartaba a una persona real en silencio. Cuando el
 * intervalo no es medible se ignora la señal en vez de asumir lo peor: el
 * honeypot sigue cubriendo, y mandar un `startedAt` futuro no le da al bot nada
 * que no lograra ya mandando uno muy viejo.
 */
export const isTooFast = (startedAt: number, now: number): boolean => {
  const elapsed = now - startedAt;
  return elapsed >= 0 && elapsed < MIN_FILL_MS;
};

/**
 * Campos que el usuario ve y puede corregir. El honeypot y el timestamp quedan
 * fuera: si fallan, no se le dice al bot cuál de los dos lo delató.
 */
export const VISIBLE_FIELDS = [
  'name',
  'email',
  'company',
  'country',
  'message',
] as const satisfies readonly (keyof ContactInput)[];

export type VisibleField = (typeof VISIBLE_FIELDS)[number];
