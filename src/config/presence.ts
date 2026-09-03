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
  { id: 'caribe', countries: ['DO', 'PR', 'JM', 'TT'] },
  { id: 'colombia', countries: ['CO'] },
] as const;

/** Todos los países cubiertos, aplanados. Alimenta el filtro del Partner Locator. */
export const coveredCountries: readonly CountryCode[] = regions.flatMap(
  (region) => region.countries,
);

export const regionOf = (country: CountryCode): RegionId | undefined =>
  regions.find((region) => region.countries.includes(country))?.id;

/** Par latitud/longitud, en el orden que espera el globo. */
export type Coordinates = readonly [latitude: number, longitude: number];

/**
 * Centroide aproximado de cada país cubierto.
 *
 * Son centroides y no ciudades a propósito: el globo representa COBERTURA, no
 * oficinas. Poner el punto de México en Monterrey daría a entender que la
 * cobertura es de esa zona y no del país.
 *
 * Vive aquí y no en el componente porque es dato del territorio, igual que
 * `regions`. Este módulo sigue sin importar runtime de React.
 */
export const countryCoordinates: Readonly<Record<CountryCode, Coordinates>> = {
  MX: [23.6345, -102.5528],
  GT: [15.7835, -90.2308],
  BZ: [17.1899, -88.4976],
  SV: [13.7942, -88.8965],
  HN: [15.2, -86.2419],
  NI: [12.8654, -85.2072],
  CR: [9.7489, -83.7534],
  PA: [8.538, -80.7821],
  CO: [4.5709, -74.2973],
  DO: [18.7357, -70.1627],
  PR: [18.2208, -66.5901],
  JM: [18.1096, -77.2975],
  TT: [10.6918, -61.2225],
} as const;

/**
 * Desde dónde sale la distribución: la oficina de Monterrey.
 *
 * Es el origen de los arcos del globo. No sale de `brand.contact.address`
 * porque allí la dirección es postal —para el JSON-LD y el enlace de mapas— y
 * añadirle coordenadas mezclaría dos usos distintos del mismo dato.
 */
export const distributionOrigin: Coordinates = [25.6866, -100.3161];
