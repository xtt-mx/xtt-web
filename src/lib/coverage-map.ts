import { geoBounds, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

import { coveredCountries, isoNumericToCode } from '@/config/presence';
import type { CountryCode } from '@/config/types';

import world from 'world-atlas/countries-110m.json';

/**
 * Trazados SVG del territorio comercial, listos para pintar.
 *
 * Esto corre SOLO EN EL SERVIDOR, y es la razón de ser del módulo: la página del
 * Partner Locator es estática, así que el cálculo ocurre una vez en el build y al
 * navegador solo le llegan las cadenas `d`. El atlas nunca se descarga.
 *
 * --- Por qué 110m y no 50m ---
 *
 * Medido, no elegido. Con el contexto incluido, los trazados pesan:
 *
 *   50m  → 337 KB     110m → 39 KB     110m con `digits(1)` → 29 KB
 *
 * 50m queda descartado por peso. Y tampoco vale la mezcla tentadora —cobertura en
 * 50m, vecinos en 110m, 54 KB— porque las fronteras de las dos resoluciones no
 * coinciden: aparecería una costura en el borde con Estados Unidos y en todos los
 * de Colombia. Una sola resolución lo evita.
 *
 * `digits(1)` redondea a un decimal de píxel. Ahorra 10 KB y a este tamaño no hay
 * diferencia visible.
 */

/**
 * Lienzo de referencia. No es el tamaño en pantalla —el SVG escala— sino el
 * sistema de coordenadas del `viewBox`.
 *
 * La proporción 4:3 es la del territorio: de la frontera norte de México a
 * Colombia hay aproximadamente tanto de ancho como de alto más un tercio. Con un
 * lienzo más apaisado sobraría mar a los lados.
 */
const ANCHO = 800;
const ALTO = 600;
const MARGEN = 24;

/**
 * Cuánto se extiende el contexto más allá del territorio, en grados.
 *
 * Sin vecinos el mapa parece islas flotando en el vacío; con los 241 países el
 * payload se dispara. 12° deja entrar el sur de Estados Unidos, Cuba, La
 * Española, Venezuela y el norte de Brasil, que es lo que hace legible la forma.
 */
const HOLGURA_GRADOS = 12;

export interface CoveredPath {
  readonly code: CountryCode;
  readonly d: string;
  /**
   * `transform` de CSS que centra y amplía este país. Se calcula aquí y no en el
   * navegador porque la geometría ya está a mano: el cliente solo lo asigna y
   * deja que CSS lo interpole.
   */
  readonly zoom: string;
}

/**
 * Tope de ampliación.
 *
 * Sin él, El Salvador o Puerto Rico se ampliarían veinte veces y el visitante
 * acabaría mirando una mancha de color sin referencias. Con el tope, los países
 * pequeños se acercan hasta donde siguen reconociéndose junto a sus vecinos.
 */
const ZOOM_MAXIMO = 6;

/**
 * Qué fracción del lienzo ocupa el país ampliado.
 *
 * Con 0.55 México salía en `scale(1)`: ya ocupa esa parte del mapa, así que la
 * cuenta pedía no acercarse. El acercamiento tiene que notarse también en los
 * países grandes, no solo en los diminutos.
 */
const OCUPACION = 0.8;

export interface CoverageGeometry {
  readonly viewBox: string;
  /** Los países del territorio, en el orden de `coveredCountries`. */
  readonly covered: readonly CoveredPath[];
  /** Vecinos, para dar forma al mapa. Sin identificar: no son interactivos. */
  readonly context: readonly string[];
}

/**
 * El JSON del atlas no trae tipos propios. El cast es a la forma que el propio
 * paquete documenta y que `topojson-client` espera; sin él, `feature()` no
 * compila.
 */
const topology = world as unknown as Topology<{ countries: GeometryCollection }>;

/**
 * El segundo cast es por los overloads de `feature()`: con una `GeometryCollection`
 * devuelve una `FeatureCollection`, pero TypeScript resuelve antes el overload que
 * devuelve un `Feature` suelto, que no tiene `.features`.
 */
const todos = (
  feature(topology, topology.objects.countries) as FeatureCollection<Geometry>
).features;

const esCubierto = (f: Feature<Geometry>) => isoNumericToCode[String(f.id)] !== undefined;

const calcular = (): CoverageGeometry => {
  const cubiertos = todos.filter(esCubierto);

  const territorio = { type: 'FeatureCollection' as const, features: cubiertos };

  const proyeccion = geoMercator().fitExtent(
    [
      [MARGEN, MARGEN],
      [ANCHO - MARGEN, ALTO - MARGEN],
    ],
    territorio,
  );

  const trazar = geoPath(proyeccion).digits(1);

  const [[oeste, sur], [este, norte]] = geoBounds(territorio);

  const enCuadro = (f: Feature<Geometry>) => {
    const [[w, s], [e, n]] = geoBounds(f);
    return (
      e >= oeste - HOLGURA_GRADOS &&
      w <= este + HOLGURA_GRADOS &&
      n >= sur - HOLGURA_GRADOS &&
      s <= norte + HOLGURA_GRADOS
    );
  };

  // Por `coveredCountries` y no por el orden del atlas: así el DOM sale en el
  // mismo orden que la configuración y los tests pueden compararlos.
  const porCodigo = new Map(
    cubiertos.map((f) => [isoNumericToCode[String(f.id)] as CountryCode, f]),
  );

  const redondo = (n: number) => Math.round(n * 10) / 10;

  /** Centrar y ampliar: la misma cuenta que hace `zoom.fitBounds` de d3. */
  const zoomDe = (f: Feature<Geometry>) => {
    const [[x0, y0], [x1, y1]] = trazar.bounds(f);
    const centroX = (x0 + x1) / 2;
    const centroY = (y0 + y1) / 2;
    const k = Math.min(
      ZOOM_MAXIMO,
      OCUPACION / Math.max((x1 - x0) / ANCHO, (y1 - y0) / ALTO),
    );
    const dx = ANCHO / 2 - k * centroX;
    const dy = ALTO / 2 - k * centroY;
    return `translate(${redondo(dx)}px, ${redondo(dy)}px) scale(${redondo(k)})`;
  };

  const covered = coveredCountries.flatMap((code) => {
    const f = porCodigo.get(code);
    const d = f === undefined ? null : trazar(f);
    return d === null || d === ''
      ? []
      : [{ code, d, zoom: zoomDe(f as Feature<Geometry>) }];
  });

  const context = todos
    .filter((f) => !esCubierto(f) && enCuadro(f))
    .map((f) => trazar(f))
    .filter((d): d is string => d !== null && d !== '');

  return { viewBox: `0 0 ${ANCHO} ${ALTO}`, covered, context };
};

/**
 * Memoizado: el resultado no depende de nada y recalcularlo por cada idioma
 * duplicaría el trabajo en el build sin cambiar un píxel.
 */
let memoria: CoverageGeometry | null = null;

export const coverageGeometry = (): CoverageGeometry => (memoria ??= calcular());
