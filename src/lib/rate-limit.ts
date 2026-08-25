interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  readonly ok: boolean;
  /** Peticiones que quedan en la ventana actual. */
  readonly remaining: number;
  /** Segundos hasta que la ventana se reinicia. Alimenta el header `Retry-After`. */
  readonly retryAfter: number;
}

/**
 * Limitador de peticiones por clave, en memoria.
 *
 * ⚠️ El estado vive en el proceso: se pierde al reiniciar el contenedor y NO se
 * comparte entre réplicas. Hoy el VPS corre una sola instancia, así que alcanza;
 * el día que haya más de una, esto se cambia por Redis y no antes — meter Redis
 * ahora sería infraestructura que nadie necesita todavía.
 *
 * No es una defensa contra un ataque decidido (rotar IPs lo evade). Su trabajo es
 * evitar que un script tonto o un bucle accidental vacíe el saldo de la API o
 * llene el buzón de contacto.
 */
const buckets = new Map<string, Bucket>();

/** Evita que el Map crezca sin techo si llegan muchas IPs distintas. */
const MAX_BUCKETS = 10_000;

const sweep = (now: number): void => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export const rateLimit = (
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult => {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) sweep(now);

    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfter };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfter };
};

/**
 * IP del cliente detrás de Caddy.
 *
 * Caddy pone la IP real en `X-Forwarded-For`; el primer valor es el cliente y el
 * resto son proxies intermedios. Sin proxy al frente el header no existe y se
 * cae a una clave fija: en local todo el tráfico comparte cubeta, que es
 * exactamente lo que se quiere para poder probar el límite.
 */
export const clientKey = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? 'local';
};
