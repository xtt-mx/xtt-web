import { expect, test } from '@playwright/test';

import { isTooFast, MIN_FILL_MS } from '../src/lib/contact-schema';

/**
 * Las trampas antispam se prueban aquí y no contra `/api/contact` porque desde
 * fuera del endpoint son invisibles a propósito: un envío descartado responde
 * `200 {ok:true}`, exactamente igual que uno enviado, para no decirle al bot qué
 * lo delató. Una prueba de extremo a extremo no puede distinguir los dos casos,
 * y una que lo intente pasa con y sin el fallo — es decir, no prueba nada.
 */

const NOW = 1_700_000_000_000;

test.describe('isTooFast', () => {
  test('descarta el envío instantáneo, que es el caso real de bot', () => {
    expect(isTooFast(NOW, NOW)).toBe(true);
    expect(isTooFast(NOW - (MIN_FILL_MS - 1), NOW)).toBe(true);
  });

  test('deja pasar a quien se tomó su tiempo', () => {
    expect(isTooFast(NOW - MIN_FILL_MS, NOW)).toBe(false);
    expect(isTooFast(NOW - 60_000, NOW)).toBe(false);
  });

  /**
   * El fallo que motivó esta función. `startedAt` lo pone el reloj del
   * navegador; si va adelantado, el intervalo sale negativo y la comprobación
   * ingenua `elapsed < MIN_FILL_MS` lo tomaba por bot.
   *
   * El modo de fallo era el peor: el descarte responde 200, así que la persona
   * leía "gracias, te contactamos pronto" mientras su mensaje no llegaba a
   * nadie. Ni ella ni XTT se enteraban. Bastaba un segundo de desfase.
   */
  test('un reloj adelantado no convierte a una persona en bot', () => {
    expect(isTooFast(NOW + 1_000, NOW)).toBe(false);
    expect(isTooFast(NOW + 5 * 60_000, NOW)).toBe(false);
    expect(isTooFast(NOW + 24 * 60 * 60_000, NOW)).toBe(false);
  });
});
