import { Lato, League_Gothic, Roboto_Mono } from 'next/font/google';

/**
 * Tipografías del sitio. Las tres están en el manual de marca (págs. 14–15).
 *
 * Sobre Open Sauce: era la primera opción para el texto, pero no está en Google
 * Fonts y self-hostearla implica meter binarios de un tercero al repo. Lato
 * también está en el manual, lee mejor que Open Sans a tamaños de párrafo y se
 * sirve por el pipeline de `next/font` (self-host automático, cero requests a
 * Google en runtime). Si más adelante XTT compra/aprueba Open Sauce, se cambia
 * solo este archivo.
 */

/** Display condensada: H1, numerales de sección, cifras grandes. */
export const displayFont = League_Gothic({
  variable: '--next-font-display',
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  preload: true,
});

/** Texto y UI. */
export const sansFont = Lato({
  variable: '--next-font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: true,
});

/** Eyebrows, etiquetas y códigos de país del mapa. Textura técnica/telecom. */
export const monoFont = Roboto_Mono({
  variable: '--next-font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  // Nunca es el primer texto que se pinta; precargarlo competiría con el LCP.
  preload: false,
});

export const fontVariables = [
  displayFont.variable,
  sansFont.variable,
  monoFont.variable,
].join(' ');
