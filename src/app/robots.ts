import type { MetadataRoute } from 'next';

import { siteUrl } from '@/config/brand';

/**
 * robots.txt.
 *
 * Deliberadamente permisivo: este es el sitio institucional y todo lo que sirve
 * está pensado para encontrarse. Lo único que se excluye es `/api`, que no son
 * páginas sino los dos handlers que reenvían a n8n — no tienen nada que indexar
 * y aparecer en resultados solo invita a que los prueben.
 *
 * OJO: esto NO protege un entorno de previsualización. `robots.txt` es una
 * petición, no un candado, y las páginas de este sitio salen como
 * `index, follow` por defecto. Para que un despliegue de prueba no acabe
 * compitiendo en Google con el sitio real está `docker-compose.preview.yml`,
 * que pone contraseña y cabecera `X-Robots-Tag` en Caddy. Esa sí es la barrera.
 */
const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: '/api/',
  },
  sitemap: new URL('/sitemap.xml', siteUrl).toString(),
});

export default robots;
