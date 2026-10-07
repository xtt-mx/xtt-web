import type { CountryCode, Region, RegionId } from './types';

/**
 * Territorio comercial de XTT: México, Centroamérica, Caribe y Sudamérica.
 *
 * La cuarta región se llamó «Colombia» hasta que el cliente la renombró a
 * «Sudamérica» en el documento de textos. El cambio es suyo y es comercial, pero
 * conviene saber qué arrastra: la región SIGUE conteniendo solo Colombia, así
 * que el sitio nombra un continente donde hay un país.
 *
 * Por eso `PresenceRegions` lista los países de la región en vez de ocultarlos:
 * decir «Sudamérica» sin decir cuál sería prometer una cobertura que no existe.
 * Si mañana entra Perú o Chile, basta con añadirlos aquí.
 */
export const regions: readonly Region[] = [
  { id: 'mexico', countries: ['MX'] },
  { id: 'centroamerica', countries: ['GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA'] },
  { id: 'caribe', countries: ['DO', 'PR', 'JM'] },
  { id: 'sudamerica', countries: ['CO'] },
] as const;

/** Todos los países cubiertos, aplanados. Lo consume el mapa SVG para iluminar regiones. */
export const coveredCountries: readonly CountryCode[] = regions.flatMap(
  (region) => region.countries,
);

export const regionOf = (country: CountryCode): RegionId | undefined =>
  regions.find((region) => region.countries.includes(country))?.id;
