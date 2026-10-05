import { expect, test } from '@playwright/test';

import { brand } from '../src/config/brand';
import { solutions } from '../src/config/solutions';
import { buildKnowledge, chatRules } from '../src/lib/chat-knowledge';
import { MAX_HISTORY, trimHistory, type ChatTurn } from '../src/lib/chat-schema';
import en_ from '../messages/en.json';
import es_ from '../messages/es.json';

const messages = { es: es_, en: en_ };

/**
 * El corpus se prueba aquí y no contra `/api/chat` porque su modo de fallo es
 * invisible desde fuera: si falta una solución, el endpoint sigue respondiendo
 * 200 y el bot sigue contestando — simplemente contesta peor, o dice que no sabe
 * algo que el sitio sí explica. No hay error que capturar, solo calidad que se
 * degrada en silencio hasta que alguien lee una transcripción.
 *
 * Es también la prueba de que "el conocimiento sale de la propia página" sigue
 * siendo cierto: si alguien reemplaza `buildKnowledge` por un texto pegado a
 * mano, estas afirmaciones dejan de pasar.
 */

const es = buildKnowledge('es');
const en = buildKnowledge('en');

test.describe('buildKnowledge', () => {
  test('incluye las cuatro soluciones con su detalle, no solo el nombre', () => {
    // Un corpus con los titulares pero sin el cuerpo produce un bot que sabe
    // enumerar las soluciones y no sabe explicar ninguna.
    expect(solutions).toHaveLength(4);

    for (const [locale, corpus] of [
      ['es', es],
      ['en', en],
    ] as const) {
      const copy = messages[locale].solutions;

      for (const solution of solutions) {
        expect(corpus).toContain(copy[solution.id].name);
        expect(corpus).toContain(copy[solution.id].detail);
      }
    }
  });

  test('incluye la cobertura real, país por país', () => {
    // Los países son la pregunta más previsible de un mayorista regional, y la
    // que peor envejece si el bot improvisa: prometer Perú cuesta una reunión.
    expect(es).toContain('Guatemala');
    expect(es).toContain('República Dominicana');
    expect(es).toContain('Colombia');

    expect(en).toContain('Guatemala');
    expect(en).toContain('Dominican Republic');
  });

  test('incluye los datos de contacto reales', () => {
    for (const corpus of [es, en]) {
      expect(corpus).toContain(brand.contact.email);
      expect(corpus).toContain(brand.contact.phone);
      expect(corpus).toContain(String(brand.foundedYear));
    }
  });

  /**
   * `partners` está vacío a propósito mientras Sergio no entregue el listado.
   * El bot tiene que poder decir eso; si el corpus callara, el modelo rellenaría
   * el hueco con nombres inventados, que es exactamente el fallo que el
   * directorio vacío evita en la UI.
   */
  test('dice que el directorio de partners todavía no se publica', () => {
    expect(es).toContain(messages.es.partnerLocator.empty);
    expect(en).toContain(messages.en.partnerLocator.empty);
  });

  /**
   * Los encabezados del corpus también van traducidos. Con los títulos en
   * español y los párrafos en inglés, el modelo tiende a mezclar los dos idiomas
   * en la respuesta — que es justo lo que la primera regla intenta evitar.
   */
  test('cada idioma trae su propio texto, no el español dos veces', () => {
    expect(es).not.toEqual(en);

    expect(es).toContain('## Soluciones que distribuye');
    expect(es).toContain('## Dónde opera');

    expect(en).toContain('## Solutions it distributes');
    expect(en).toContain('## Where it operates');
    expect(en).not.toContain('## Dónde opera');
  });
});

test.describe('chatRules', () => {
  /**
   * El idioma lo marca quien escribe, no la página. Alguien puede llegar a la
   * versión en español desde una búsqueda y preguntar en inglés; contestarle en
   * español porque la URL no lleva `/en` es tratarlo como un error de ruteo.
   * El idioma de la página queda solo como respaldo cuando no se distingue.
   */
  test('sigue el idioma de quien pregunta, con el de la página de respaldo', () => {
    for (const rules of [chatRules('es'), chatRules('en')]) {
      expect(rules).toContain('MISMO idioma en que te escriban');
    }

    expect(chatRules('es')).toContain('usa español');
    expect(chatRules('en')).toContain('usa inglés');
  });

  /**
   * Regresión de algo que se vio en producción: el bot cerraba con "visita
   * nuestro formulario en /contacto". Escrita, una ruta no es clicable y se lee
   * como un error de la página.
   *
   * Se arregla por los dos lados y por eso se prueban los dos: la regla se lo
   * prohíbe, y el corpus ya no le da ninguna ruta que copiar. Con solo lo
   * primero, el modelo acaba citando lo que tiene delante.
   */
  test('prohíbe escribir rutas, y el corpus no le da ninguna que copiar', () => {
    for (const rules of [chatRules('es'), chatRules('en')]) {
      expect(rules).toContain('NUNCA escribas rutas');
    }

    for (const corpus of [es, en]) {
      expect(corpus).not.toContain('/contacto');
      expect(corpus).not.toContain('/en/contact');
      expect(corpus).not.toContain('xtt.com.mx/');
    }
  });

  /**
   * "Contact Center as a Service" es el nombre del producto y se queda; lo que
   * no puede pasar es que el anglicismo se cuele en la prosa en español.
   */
  test('protege los nombres de producto al pedir español sin anglicismos', () => {
    const rules = chatRules('es');
    expect(rules).toContain('evita el término');
    expect(rules).toContain('Contact Center as a Service');
  });

  test('prohíbe explícitamente inventar y dar precios', () => {
    const rules = chatRules('es');
    expect(rules).toContain('No inventes');
    expect(rules).toContain('precios');
  });
});

test.describe('trimHistory', () => {
  const turn = (n: number): ChatTurn => ({ role: 'user', content: `pregunta ${n}` });

  test('deja pasar una conversación corta sin tocarla', () => {
    const turns = [turn(1), turn(2)];
    expect(trimHistory(turns)).toEqual(turns);
  });

  /**
   * El recorte se queda con los ÚLTIMOS turnos, no con los primeros. Al revés,
   * una conversación larga acabaría respondiendo con el contexto del saludo
   * inicial mientras ignora lo que se acaba de preguntar.
   */
  test('conserva el final de la conversación, que es el contexto que importa', () => {
    const turns = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => turn(i));
    const trimmed = trimHistory(turns);

    expect(trimmed).toHaveLength(MAX_HISTORY);
    expect(trimmed.at(-1)).toEqual(turns.at(-1));
    expect(trimmed[0]).toEqual(turns[5]);
  });
});
