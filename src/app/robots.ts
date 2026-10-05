import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

import { canonicalUrl } from '@/config/brand';

/**
 * robots.txt.
 *
 * En el dominio real es deliberadamente permisivo: este es el sitio
 * institucional y todo lo que sirve está pensado para encontrarse. Lo único que
 * se excluye es `/api`, que no son páginas sino los dos handlers que reenvían a
 * n8n — no tienen nada que indexar y aparecer en resultados solo invita a que
 * los prueben.
 *
 * EN CUALQUIER OTRO DOMINIO SE PROHÍBE TODO, y esto no es celo: es el único
 * freno que queda. Las páginas salen como `index, follow` por defecto, así que
 * un despliegue de ensayo accesible se indexa solo y acaba compitiendo en
 * Google con el sitio real — con los textos aún sin aprobar y las OPCIÓN 2 del
 * documento de ClickUp sin resolver.
 *
 * --- Por qué mira la petición y no una variable de entorno ---
 *
 * La primera versión comparaba `NEXT_PUBLIC_SITE_URL` con el dominio canónico.
 * Funciona, pero falla hacia el lado equivocado en el caso más probable: si
 * alguien despliega y OLVIDA poner la variable, el valor cae al dominio
 * canónico y el ensayo se declara producción. Justo entonces es cuando hace
 * falta el freno.
 *
 * Leyendo la cabecera `Host` no hay nada que olvidar. El sitio sabe por sí
 * mismo dónde está respondiendo, en cualquier entorno y sin configurar nada.
 *
 * El precio es que este archivo deja de ser estático y se resuelve en cada
 * petición. Para un `robots.txt` que piden los rastreadores de vez en cuando,
 * es gratis.
 */

const robots = async (): Promise<MetadataRoute.Robots> => {
  const host = (await headers()).get('host');
  const esElDominioReal = host === new URL(canonicalUrl).host;

  if (!esElDominioReal) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: new URL('/sitemap.xml', canonicalUrl).toString(),
  };
};

export default robots;
