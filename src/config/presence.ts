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

/**
 * ISO 3166-1 numérico → alpha-2, solo para el territorio.
 *
 * Hace falta porque `world-atlas` identifica los países por su código NUMÉRICO y
 * sus propiedades solo traen el nombre en inglés. Casar por nombre sería frágil
 * —«Dominican Rep.» contra «República Dominicana»—; por código es exacto.
 *
 * ⚠️ Los numéricos van con CEROS A LA IZQUIERDA y como cadena: Belice es `084`,
 * no `84`. Buscarlo sin el cero da «no existe», que es un fallo silencioso y
 * convincente: el mapa se dibuja entero y solo falta un país.
 */
export const isoNumericToCode: Readonly<Partial<Record<string, CountryCode>>> = {
  '484': 'MX',
  '320': 'GT',
  '084': 'BZ',
  '222': 'SV',
  '340': 'HN',
  '558': 'NI',
  '188': 'CR',
  '591': 'PA',
  '170': 'CO',
  '214': 'DO',
  '630': 'PR',
  '388': 'JM',
};

export const regionOf = (country: CountryCode): RegionId | undefined =>
  regions.find((region) => region.countries.includes(country))?.id;
