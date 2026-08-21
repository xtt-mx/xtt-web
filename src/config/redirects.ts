import type { Redirect } from 'next/dist/lib/load-custom-routes';

/**
 * 301 desde el WordPress anterior.
 *
 * El sitio viejo usaba permalinks planos (`/slug/`), así que todo cuelga de la raíz.
 * Next normaliza el trailing slash, por lo que basta declarar la ruta sin él.
 *
 * Se mantienen aunque el blog desaparezca: dejar 404s tira el SEO acumulado y rompe
 * los links que ya circulan en LinkedIn y en correos viejos. El costo de conservarlos
 * es una tabla estática; el de perderlos, tráfico.
 *
 * Verificado por `scripts/check-redirects.mjs`, que hace `curl -I` a cada origen.
 */

const permanent = (source: string, destination: string): Redirect => ({
  source,
  destination,
  permanent: true,
});

/** Páginas institucionales que cambian de nombre. */
const pages: readonly Redirect[] = [
  permanent('/inicio', '/'),
  permanent('/landing', '/'),
  permanent('/acerca-de-expertise-tech-and-training', '/nosotros'),
  permanent('/partners', '/partner-locator'),
  // No hay página de soporte en la IA nueva; la consulta se canaliza por contacto.
  permanent('/soporte', '/contacto'),
];

/**
 * Páginas por fabricante. En el sitio nuevo los fabricantes no tienen página propia:
 * se representan dentro de las soluciones y del Partner Locator.
 */
const vendors: readonly Redirect[] = [
  'five9',
  'avaya',
  'playvox',
  'net2phone',
  'rocketbot',
  'ressolve',
  'unitia',
  'mcm',
  'paquetes-comerciales-de-telefonia',
].map((slug) => permanent(`/${slug}`, '/soluciones'));

/**
 * Blog retirado. Los posts se agrupan por tema hacia la sección viva más cercana
 * en vez de mandar todo al home, que Google trata como soft-404.
 */
const blogToSolutions: readonly Redirect[] = [
  '1715el-impacto-de-la-ia-en-la-experiencia-del-cliente-revolucionando-la-interaccion-empresarial',
  'nube',
  'beneficios-de-los-servicios-de-ccaas-y-ucaas',
  'elementor-avaya-soluciones-blog',
  'la-importancia-del-contact-center-en-el-mercado-bancario',
  'casos-de-uso-de-ia-en-comunicaciones-de-atencion-medica-de-2023',
  'que-es-wfm-y-como-se-aplica-a-nuestra-vida-diaria',
  'centro-de-contacto-five9',
  'mcm-xtt-five9',
  'playvox-centro-de-contacto',
  'el-servicio-al-cliente-a-traves-de-contact-center',
  'beneficios-del-contact-center',
  'el-software-inteligente-para-centros-de-contacto-y-centros-de-llamadas-en-la-nube-de-five9-ofrece-una-experiencia-mas-humana',
  'avaya-automatizacion-del-centro-de-contacto',
  'tendencias-del-mercado-rumbo-al-2024',
  'usos-de-la-inteligencia-artificial',
].map((slug) => permanent(`/${slug}`, '/soluciones'));

/**
 * Excepción deliberada: el aviso de privacidad NO se redirige, se migra.
 * Es un requisito legal, no contenido de blog.
 */
const legal: readonly Redirect[] = [
  permanent('/politicas-de-privacidad-xtt', '/privacidad'),
];

const index: readonly Redirect[] = [permanent('/blog', '/')];

export const legacyRedirects: Redirect[] = [
  ...pages,
  ...vendors,
  ...blogToSolutions,
  ...legal,
  ...index,
];
