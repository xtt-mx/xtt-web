import type { MetadataRoute } from 'next';

import { canonicalUrl, siteUrl } from '@/config/brand';

/**
 * robots.txt.
 *
 * En producción es deliberadamente permisivo: este es el sitio institucional y
 * todo lo que sirve está pensado para encontrarse. Lo único que se excluye es
 * `/api`, que no son páginas sino los dos handlers que reenvían a n8n — no
 * tienen nada que indexar y aparecer en resultados solo invita a que los
 * prueben.
 *
 * FUERA DE PRODUCCIÓN SE PROHÍBE TODO, y esto no es celo: es el único freno que
 * queda. Las páginas de este sitio salen como `index, follow` por defecto, así
 * que un despliegue de ensayo accesible se indexa solo y acaba compitiendo en
 * Google con el sitio real — con los textos aún sin aprobar y las OPCIÓN 2 del
 * documento de ClickUp sin resolver. Donde hay Caddy delante, esto lo resolvía
 * `Caddyfile.preview` con contraseña; en el hosting gestionado de Hostinger no
 * hay esa capa, así que el freno tiene que vivir aquí dentro.
 *
 * El criterio es el DOMINIO, no una bandera aparte, para que no haya dos
 * fuentes de verdad que puedan contradecirse: si la URL pública no es la
 * canónica, esto no es producción. Y el fallo es hacia el lado seguro — una
 * variable mal puesta deja el sitio sin indexar, que se arregla en un build;
 * al revés se arregla pidiéndole a Google que olvide páginas, que tarda
 * semanas.
 */

const esProduccion = (): boolean => {
  try {
    return new URL(siteUrl).hostname === new URL(canonicalUrl).hostname;
  } catch {
    // `siteUrl` sale de una variable de entorno: si llega rota, no es
    // producción.
    return false;
  }
};

const robots = (): MetadataRoute.Robots =>
  esProduccion()
    ? {
        rules: {
          userAgent: '*',
          allow: '/',
          disallow: '/api/',
        },
        sitemap: new URL('/sitemap.xml', siteUrl).toString(),
      }
    : {
        rules: {
          userAgent: '*',
          disallow: '/',
        },
      };

export default robots;
