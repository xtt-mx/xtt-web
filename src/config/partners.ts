import type { CountryCode, Partner } from './types';

/**
 * Directorio del Partner Locator.
 *
 * ⚠️ VACÍO A PROPÓSITO. Sergio todavía no entrega el listado real de partners.
 * Preferimos un arreglo vacío —que hace que la UI muestre su estado "sin resultados"
 * real— antes que datos inventados que alguien pueda confundir con producción.
 * Ver README §Status & completeness.
 */
export const partners: readonly Partner[] = [];

export const partnersByCountry = (country: CountryCode): readonly Partner[] =>
  partners.filter((partner) => partner.country === country);

/** Países que hoy tienen al menos un partner. El mapa los distingue de los que solo son cobertura. */
export const countriesWithPartners = (): readonly CountryCode[] => [
  ...new Set(partners.map((partner) => partner.country)),
];
