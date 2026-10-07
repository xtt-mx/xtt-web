'use client';

import { useTranslations } from 'next-intl';

import type { CountryCode } from '@/config/types';
import { cn } from '@/lib/cn';
import type { CoverageGeometry } from '@/lib/coverage-map';

import styles from './CoverageMap.module.css';

interface CoverageMapProps {
  /** Trazados ya proyectados en el servidor. Ver `src/lib/coverage-map.ts`. */
  readonly geometry: CoverageGeometry;
  readonly withPartners: readonly CountryCode[];
  readonly selected: CountryCode | null;
  readonly onSelect: (code: CountryCode | null) => void;
}

/**
 * Mapa del territorio comercial, clicable y con acercamiento al país elegido.
 *
 * --- Por qué va `aria-hidden` ---
 *
 * El mapa es un ATAJO, no un control. Quien filtra de verdad es el `<select>`
 * que vive al lado, y que ofrece exactamente los mismos países.
 *
 * Hacer los países enfocables duplicaría ese control: un lector de pantalla
 * leería la lista de países dos veces y quien navega con teclado tendría que
 * cruzar doce `<path>` para llegar al siguiente campo. Una rejilla de formas
 * irregulares es peor herramienta que un desplegable nativo para todo el que no
 * use ratón, así que el mapa añade una manera de hacerlo y no quita ninguna.
 */
export const CoverageMap = ({
  geometry,
  withPartners,
  selected,
  onSelect,
}: CoverageMapProps) => {
  const t = useTranslations('partnerLocator.map');

  /**
   * El acercamiento viene calculado del servidor; aquí solo se elige cuál. CSS
   * interpola entre el anterior y el nuevo, así que el movimiento sale gratis y
   * la preferencia de «reducir movimiento» lo congela sin código extra.
   */
  const acercamiento = {
    transform: geometry.covered.find((c) => c.code === selected)?.zoom ?? 'none',
  };

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.map}
        viewBox={geometry.viewBox}
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          {/* Viñeteado del color del fondo. Los vecinos llegan al borde del
              lienzo y se cortarían en seco; como el mapa flota sin marco, ese
              corte recto parece un error de recorte en vez de una decisión.

              Va como capa FIJA entre el contexto y el territorio, y no como
              máscara sobre el contexto, por el acercamiento: una máscara se
              movería con el país ampliado y acabaría apagando justo lo que se
              quiere mirar. Dibujada entre las dos capas, solo difumina los
              vecinos y deja el territorio intacto. */}
          <radialGradient id="xtt-map-vignette">
            <stop offset="55%" className={styles.vignetteInner} />
            <stop offset="100%" className={styles.vignetteOuter} />
          </radialGradient>
        </defs>

        <g className={styles.zoom} style={acercamiento}>
          <g className={styles.context}>
            {geometry.context.map((d) => (
              /* La clave es el propio trazado: son únicos y estables entre
                 builds, y evita indexar un array que no se reordena nunca. */
              <path key={d} d={d} />
            ))}
          </g>
        </g>

        <rect className={styles.vignette} width="100%" height="100%" />

        <g className={styles.zoom} style={acercamiento}>
          {geometry.covered.map(({ code, d }) => (
            <path
              key={code}
              d={d}
              /* El SVG va `aria-hidden`, así que estos países no tienen nombre
                 accesible por el que localizarlos. Este atributo es su única
                 identidad en el DOM: lo usan los tests y sirve para depurar. */
              data-country={code}
              className={cn(
                styles.country,
                withPartners.includes(code) && styles.hasPartner,
                selected === code && styles.selected,
              )}
              /* Volver a pulsar el país elegido lo deselecciona y devuelve el
                 mapa a su sitio: es lo que espera cualquiera que haya usado un
                 filtro, y ahorra ir al desplegable a buscar "Todos". */
              onClick={() => onSelect(selected === code ? null : code)}
            />
          ))}
        </g>
      </svg>

      {/* La leyenda solo aparece cuando hay DOS estados que distinguir. Mientras
          el directorio esté vacío todos los países son cobertura, y una leyenda
          de un solo elemento no explica nada: lo decora. */}
      {withPartners.length > 0 && (
        <ul className={styles.legend}>
          <li className={cn('mono', styles.legendItem)}>
            <span className={cn(styles.swatch, styles.swatchCovered)} />
            {t('legendCovered')}
          </li>
          <li className={cn('mono', styles.legendItem)}>
            <span className={cn(styles.swatch, styles.swatchPartner)} />
            {t('legendPartner')}
          </li>
        </ul>
      )}
    </div>
  );
};
