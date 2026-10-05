/**
 * Tipos compartidos del contenido del sitio.
 *
 * Regla: nada aquí importa de React ni de Next. Este módulo tiene que poder
 * consumirse desde un script de Node (sitemap, validaciones, seeds) sin arrastrar
 * el runtime del framework.
 */

export type Locale = 'es' | 'en';

/** Clave estable de una solución. Se usa en URLs, en analytics y como key de i18n. */
export type SolutionId = 'ccaas' | 'sbc-telecom-data' | 'messaging' | 'sip';

/** Clave estable de un país donde XTT tiene presencia. ISO 3166-1 alpha-2. */
export type CountryCode =
  'MX' | 'GT' | 'BZ' | 'SV' | 'HN' | 'NI' | 'CR' | 'PA' | 'CO' | 'DO' | 'PR' | 'JM';

/** Agrupación comercial que usa XTT para hablar de su territorio. */
export type RegionId = 'mexico' | 'centroamerica' | 'caribe' | 'colombia';

export interface Solution {
  readonly id: SolutionId;
  /** Slug en la URL, por locale. */
  readonly slug: Readonly<Record<Locale, string>>;
}

export interface Region {
  readonly id: RegionId;
  readonly countries: readonly CountryCode[];
}

export interface Partner {
  readonly name: string;
  readonly country: CountryCode;
  readonly city: string;
  readonly solutions: readonly SolutionId[];
  readonly website?: string;
  readonly tier: 'platinum' | 'gold' | 'authorized';
}
