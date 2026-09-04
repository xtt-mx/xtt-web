import { expect, test } from '@playwright/test';

import es from '../messages/es.json';

/**
 * La órbita del hero.
 *
 * El escenario tiene siete capas decorativas encima de una lista de cuatro
 * items. Lo que se prueba aquí no es cómo se ve —para eso está el ojo— sino las
 * dos cosas que la decoración puede romper sin que se note: la semántica de la
 * lista y que la profundidad siga viva.
 */

const orbita = 'ul[aria-label]';

test.describe('Órbita del hero', () => {
  test('sigue siendo una lista de cuatro soluciones y no una figura', async ({
    page,
  }) => {
    await page.goto('/');

    const lista = page.getByRole('list', { name: es.hero.orbitLabel });
    await expect(lista).toBeVisible();
    await expect(lista.getByRole('listitem')).toHaveCount(4);

    // El nombre de cada solución es texto real, no un `alt` ni un `title`.
    for (const solucion of [
      es.solutions.ccaas.name,
      es.solutions['sbc-telecom-data'].name,
      es.solutions.messaging.name,
      es.solutions.sip.name,
    ]) {
      await expect(lista.getByText(solucion, { exact: true })).toBeVisible();
    }
  });

  test('el decorado no entra en el árbol de accesibilidad', async ({ page }) => {
    await page.goto('/');

    // Niebla, estrellas, trama, elipses y pulsos: nada de eso significa algo
    // para quien no lo ve, y la lista ya dice todo lo que hay que decir.
    const escenario = await page.evaluate((sel) => {
      const lista = document.querySelector(sel);
      const stage = lista?.parentElement;
      if (!lista || !stage) return null;

      // Todo menos la lista: si de ahí sale texto, algo del decorado se está
      // anunciando dos veces.
      const sinLista = stage.cloneNode(true) as HTMLElement;
      sinLista.querySelector(sel)?.remove();

      return {
        svgOculto: stage.querySelector('svg')?.getAttribute('aria-hidden'),
        textoFueraDeLaLista: sinLista.textContent?.trim() ?? '',
      };
    }, orbita);

    expect(escenario).not.toBeNull();
    expect(escenario?.svgOculto).toBe('true');
    expect(escenario?.textoFueraDeLaLista).toBe('');
  });
});

/**
 * La profundidad depende de que `--spin` avance y de que TODO lo que se deriva
 * de él avance con ella. Durante el desarrollo se midió justo el fallo
 * contrario: los nodos giraban con la opacidad y el desenfoque congelados en un
 * valor viejo mientras el apilado sí seguía al ángulo. A simple vista la órbita
 * parecía correcta —se movía— y solo al medir se veía que había perdido la
 * profundidad. Por eso el test no se conforma con que los nodos se muevan.
 */
test.describe('Órbita del hero: movimiento', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 0) < 901,
    'bajo 900 px la órbita se sustituye por una lista y no hay nada que girar',
  );

  test('los nodos giran y la profundidad cambia con ellos', async ({ page }) => {
    await page.goto('/');

    const medir = () =>
      page.evaluate((sel) => {
        const nodos = [...document.querySelectorAll(`${sel} > li`)];
        return nodos.map((nodo) => {
          const caja = nodo.getBoundingClientRect();
          const estilo = getComputedStyle(nodo);
          return {
            x: caja.x + caja.width / 2,
            y: caja.y + caja.height / 2,
            opacidad: Number(estilo.opacity),
            apilado: Number(estilo.zIndex),
          };
        });
      }, orbita);

    /**
     * Cuatro muestras y no dos. `sin()` es simétrico: entre dos instantes
     * sueltos un nodo puede volver a la misma opacidad por casualidad, y un
     * test que solo mira el principio y el final se puede tragar justo el fallo
     * que busca. Con cuatro muestras a lo largo de más de un octavo de vuelta,
     * que las cuatro coincidan es imposible.
     */
    const muestras = [await medir()];
    for (let i = 0; i < 3; i += 1) {
      await page.waitForTimeout(900);
      muestras.push(await medir());
    }

    const primera = muestras[0];
    const ultima = muestras[muestras.length - 1];
    if (!primera || !ultima) throw new Error('no se pudo medir la órbita');

    for (const [i, inicial] of primera.entries()) {
      const final = ultima[i];
      if (!final) throw new Error(`desapareció el nodo ${i}`);

      expect(
        Math.hypot(final.x - inicial.x, final.y - inicial.y),
        `el nodo ${i} no se movió`,
      ).toBeGreaterThan(20);

      // La profundidad tiene que seguir al ángulo, no quedarse en su valor de
      // arranque. `z-index` se comprueba aparte a propósito: es la única de las
      // señales que NO puede transicionar, así que sigue cambiando aunque las
      // demás se congelen, y mirarlo solo a él da un falso verde.
      const opacidades = new Set(muestras.map((m) => m[i]?.opacidad.toFixed(3)));
      expect(
        opacidades.size,
        `el nodo ${i} se mueve con la opacidad congelada en ${inicial.opacidad}`,
      ).toBeGreaterThan(1);

      expect(
        new Set(muestras.map((m) => m[i]?.apilado)).size,
        `el nodo ${i} nunca cambia de plano`,
      ).toBeGreaterThan(1);
    }
  });

  test('con prefers-reduced-motion la órbita se queda quieta y compuesta', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const posiciones = () =>
      page.$$eval(`${orbita} > li`, (nodos) =>
        nodos.map((nodo) => {
          const caja = nodo.getBoundingClientRect();
          return { x: Math.round(caja.x), y: Math.round(caja.y) };
        }),
      );

    const antes = await posiciones();
    await page.waitForTimeout(1_500);
    expect(await posiciones()).toEqual(antes);

    /**
     * Quieta pero no amontonada. La regla global de `globals.css` corta la
     * animación de `--spin` a 0.01 ms, así que el ángulo acaba en 360° ≡ 0° y
     * cada nodo se queda en el suyo. Si algún día esa equivalencia se rompiera,
     * los cuatro caerían encima del logo y esto lo delataría.
     */
    const xs = new Set(antes.map((p) => p.x));
    expect(xs.size, 'los nodos se apilaron en el mismo sitio').toBe(antes.length);
  });

  test('ningún nodo se sale del escenario', async ({ page }) => {
    await page.goto('/');

    const fugados = await page.evaluate((sel) => {
      const lista = document.querySelector(sel);
      const escenario = lista?.parentElement;
      if (!lista || !escenario) return ['no se encontró el escenario'];

      const limite = escenario.getBoundingClientRect();
      return [...lista.children]
        .filter((nodo) => {
          const caja = nodo.getBoundingClientRect();
          return (
            caja.left < limite.left - 1 ||
            caja.right > limite.right + 1 ||
            caja.top < limite.top - 1 ||
            caja.bottom > limite.bottom + 1
          );
        })
        .map((nodo) => (nodo as HTMLElement).innerText);
    }, orbita);

    expect(fugados).toEqual([]);
  });
});
