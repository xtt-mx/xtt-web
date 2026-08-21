/**
 * Identidad de marca XTT.
 *
 * Los colores se duplican aquí a propósito: `globals.css` es la fuente de verdad
 * para lo que se pinta, pero TypeScript necesita alcanzarlos para `themeColor`,
 * JSON-LD y las imágenes OG. Si cambia uno, cambian los dos.
 *
 * Base cromática y tipografías salen del "Manual de Marca XTT 2023 v1":
 *  - pág. 5:  el LOGOTIPO va únicamente en negro o blanco.
 *  - pág. 9:  se autorizan colores de acompañamiento junto al blanco y negro.
 *  - pág. 10: rampa azul — "confianza, profesionalismo y seriedad".
 *  - pág. 11: el verde queda restringido a las marcas Khomp y Playvox.
 */

export const brand = {
  name: 'XTT',
  /** El punto es parte del logotipo, no puntuación. */
  wordmark: 'XTT.',
  legalName: 'XTT S.A. de C.V.',
  foundedYear: 2018,

  contact: {
    phone: '+52 81 8121 2614',
    /** Formato E.164 para los enlaces `tel:`. */
    phoneHref: '+528181212614',
    email: 'contacto@xtt.com.mx',
    address: {
      street: 'Prol. Ruiz Cortines #1000, Col. Gran Reserva Cumbres',
      detail: 'Plaza Malibú, Local 5, Nivel 3',
      postalCode: '64102',
      city: 'Monterrey',
      state: 'Nuevo León',
      country: 'MX',
    },
  },

  colors: {
    light: {
      bg: '#FFFFFF',
      fg: '#0B0B0B',
      accent: '#0A2DFF',
    },
    dark: {
      bg: '#0B0B0B',
      fg: '#FFFFFF',
      accent: '#0A2DFF',
    },
  },
} as const;

/**
 * El azul base NO pasa contraste como texto sobre el fondo oscuro (≈2.9:1).
 * Estos son los usos autorizados; cualquier otro es un bug de accesibilidad.
 * Verificado en `e2e/theme.spec.ts` y con axe en CI.
 */
export const accentUsage = {
  /** Relleno de botón con texto blanco encima — 7.3:1 en ambos temas. */
  fill: '#0A2DFF',
  /** Texto/links de acento en tema claro — 12.4:1 sobre blanco. */
  textOnLight: '#0A2DFF',
  /** Texto/links de acento en tema oscuro — 6.0:1 sobre #0B0B0B. */
  textOnDark: '#6A85FF',
} as const;

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xtt.com.mx';
