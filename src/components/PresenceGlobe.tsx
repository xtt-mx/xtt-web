'use client';

import createGlobe from 'cobe';
import { useEffect, useRef, useState } from 'react';

import {
  countryCoordinates,
  coveredCountries,
  distributionOrigin,
  type Coordinates,
} from '@/config/presence';
import { resolveTheme } from '@/lib/theme';

import styles from './PresenceGlobe.module.css';

/**
 * Globo de cobertura. Presentación de la lista de regiones, no sustituto.
 *
 * El canvas va `aria-hidden`: quien usa un lector de pantalla ya recibe el
 * territorio como lista, que es una forma mejor de recibirlo. Un canvas no es
 * semántico y no debe fingir que lo es. Es el mismo reparto que `OrbitHero`.
 *
 * Tres cosas que en un canvas no salen gratis y que aquí se resuelven a mano:
 * los colores, el tema y `prefers-reduced-motion`. Ver los comentarios de cada
 * una: son las excepciones a reglas del proyecto, y están donde se toman.
 */

/** Mutable a propósito: es la forma exacta que COBE pide en sus opciones. */
type Rgb = [number, number, number];

/**
 * Convierte un token de `globals.css` al arreglo 0–1 que espera COBE.
 *
 * Los colores del globo NO se escriben en este archivo. `globals.css` sigue
 * siendo la única fuente de verdad: aquí solo se leen y se cambian de formato,
 * porque WebGL no entiende hexadecimales.
 */
const hexToRgb = (hex: string): Rgb => {
  const clean = hex.trim().replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;

  const value = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(value)) return [0, 0, 0];

  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

const readColor = (token: string): Rgb =>
  hexToRgb(getComputedStyle(document.documentElement).getPropertyValue(token));

/** COBE pide tuplas mutables; esto evita un cast sobre los datos de config. */
const pair = (coordinates: Coordinates): [number, number] => [
  coordinates[0],
  coordinates[1],
];

const markers = coveredCountries.map((code) => ({
  location: pair(countryCoordinates[code]),
  size: 0.045,
}));

/**
 * Arcos desde Monterrey hacia cada país cubierto.
 *
 * México queda fuera a propósito: es el origen, no un destino, y un arco de un
 * punto a sí mismo se dibuja como un garabato sobre el país.
 */
const arcs = coveredCountries
  .filter((code) => code !== 'MX')
  .map((code) => ({
    from: pair(distributionOrigin),
    to: pair(countryCoordinates[code]),
  }));

/**
 * Rotación fija, centrada en el continente americano.
 *
 * El globo NO gira, y es una decisión de contenido, no de rendimiento: la
 * cobertura de XTT cabe entera en un hemisferio, así que una rotación continua
 * pasaría la mitad del tiempo enseñando el Pacífico vacío. Un mapa se mira, no
 * se persigue.
 */
const PHI = 0.15;
const THETA = 0.28;

export const PresenceGlobe = () => {
  const frame = useRef<HTMLDivElement>(null);

  const [isActive, setIsActive] = useState(false);
  const [size, setSize] = useState(0);

  /**
   * Cuenta cambios de tema, no guarda cuál es.
   *
   * `CLAUDE.md` prohíbe duplicar el tema en estado de React: `data-theme` en
   * `<html>` es la única fuente de verdad. Así que React solo sabe "algo
   * cambió" y es el efecto el que vuelve a preguntarle al DOM con
   * `resolveTheme()`. No hay dos versiones que puedan divergir.
   */
  const [themeRevision, setThemeRevision] = useState(0);

  useEffect(() => {
    const bump = () => setThemeRevision((n) => n + 1);

    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // También cuando el sistema cambia y la preferencia es "system".
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', bump);

    return () => {
      observer.disconnect();
      media.removeEventListener('change', bump);
    };
  }, []);

  /**
   * El globo no se crea hasta que la sección se acerca a la pantalla.
   *
   * Presencia está bajo el pliegue: construirlo al cargar gastaría batería
   * girando un canvas WebGL que nadie está mirando, y competiría por el hilo
   * principal con la parte de la página que sí se ve.
   */
  useEffect(() => {
    const element = frame.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // El tamaño en píxeles lo decide el CSS; aquí solo se mide para el canvas.
  useEffect(() => {
    const element = frame.current;
    if (!isActive || !element) return;

    const measure = () => setSize(Math.round(element.getBoundingClientRect().width));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [isActive]);

  useEffect(() => {
    const container = frame.current;
    if (!isActive || !container || size === 0) return;

    /**
     * El canvas se crea aquí y se tira entero en la limpieza, en lugar de vivir
     * en el JSX.
     *
     * No es capricho: reutilizar el mismo elemento entre creaciones deja el
     * globo a medias —se dibujan los marcadores y los arcos, pero la esfera no—
     * porque un canvas no devuelve un contexto WebGL nuevo una vez que tuvo
     * uno. Al cambiar el tema o el tamaño hay que recrear, así que cada
     * creación estrena elemento.
     *
     * COBE además envuelve el canvas en un `div` propio, y `replaceChildren()`
     * se lo lleva también. Por eso este `div` no tiene hijos en el JSX: React
     * no debe gestionar nada aquí dentro.
     */
    const element = document.createElement('canvas');
    element.className = styles.canvas ?? '';
    container.replaceChildren(element);

    const isDark = resolveTheme() === 'dark';
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    let globe;
    try {
      globe = createGlobe(element, {
        /**
         * `width` y `height` van en píxeles CSS, no de dispositivo: COBE
         * multiplica por `devicePixelRatio` internamente. Pasarlos ya
         * multiplicados cuadruplica el tamaño del búfer y, a partir de cierto
         * tamaño, la esfera deja de dibujarse.
         */
        devicePixelRatio: ratio,
        width: size,
        height: size,
        phi: PHI,
        theta: THETA,
        dark: isDark ? 1 : 0,
        diffuse: 1.2,
        mapSamples: 11_000,
        /**
         * Menos muestras dibujan puntos más grandes, y eso es lo que hace
         * legibles los continentes a este tamaño. Medido: el contraste no viene
         * de `mapBrightness` —a partir de ~12 satura y da igual subirlo— sino de
         * que los puntos del mapa se pintan MÁS OSCUROS que la esfera.
         */
        mapBrightness: isDark ? 6 : 12,
        baseColor: readColor('--globe-base'),
        markerColor: readColor('--color-accent'),
        glowColor: readColor('--globe-glow'),
        arcColor: readColor('--color-accent'),
        arcWidth: 0.4,
        arcHeight: 0.28,
        markerElevation: 0.01,
        markers,
        arcs,
      });
    } catch {
      /**
       * Sin WebGL no hay globo, y no pasa nada: la lista de regiones cuenta el
       * territorio completo por sí sola.
       *
       * Se oculta el marco tocando el DOM en vez de con estado de React. Es
       * deliberado: esto no es estado de la aplicación sino una capacidad del
       * navegador que ya no va a cambiar, y meterlo en `useState` obligaría a
       * llamar al setter dentro del efecto solo para provocar un render que no
       * aporta nada.
       */
      container.replaceChildren();
      container.hidden = true;
      return;
    }

    /**
     * No hay bucle de animación. Al no girar, tampoco hace falta comprobar
     * `prefers-reduced-motion`: no hay movimiento que reducir.
     */
    return () => {
      globe.destroy();
      container.replaceChildren();
    };
  }, [isActive, size, themeRevision]);

  return <div className={styles.frame} ref={frame} aria-hidden="true" />;
};
