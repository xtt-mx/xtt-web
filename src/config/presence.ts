import type { CountryCode, Region, RegionId } from './types';

/**
 * Territorio comercial de XTT: México, Centroamérica, Caribe y Colombia.
 *
 * Colombia va como región propia y no dentro de "Sudamérica" porque así lo plantea
 * el brief: es el único mercado sudamericano donde hay presencia hoy, y agruparlo
 * en algo más grande prometería cobertura que no existe.
 */
export const regions: readonly Region[] = [
  { id: 'mexico', countries: ['MX'] },
  { id: 'centroamerica', countries: ['GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA'] },
  { id: 'caribe', countries: ['DO', 'PR', 'JM'] },
  { id: 'colombia', countries: ['CO'] },
] as const;

/** Todos los países cubiertos, aplanados. Lo consume el mapa SVG para iluminar regiones. */
export const coveredCountries: readonly CountryCode[] = regions.flatMap(
  (region) => region.countries,
);

export const regionOf = (country: CountryCode): RegionId | undefined =>
  regions.find((region) => region.countries.includes(country))?.id;
