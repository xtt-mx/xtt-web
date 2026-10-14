import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

import { legacyRedirects } from './src/config/redirects';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * `standalone` solo cuando lo pide el Dockerfile.
   *
   * Hace que el build emita `.next/standalone/server.js` con sus dependencias
   * dentro, y que la imagen del VPS no lleve ni el código fuente ni las
   * devDependencies. Pero ese arranque exige copiar a mano `.next/static` y
   * `public` al lado del server, que es justo lo que hace el Dockerfile.
   *
   * El hosting gestionado de Hostinger no hace esas copias: compila y arranca
   * la aplicación a su manera. Con `standalone` encendido allí, el sitio se
   * construye pero se sirve sin estáticos.
   *
   * De ahí la bandera: el Dockerfile la pone y mantiene su imagen pequeña; el
   * resto de entornos obtienen un build normal. Así las dos vías de despliegue
   * siguen vivas sin duplicar configuración.
   */
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,

  /**
   * Sin optimizador de imágenes.
   *
   * Esto apaga la ruta `/_next/image`, y con ella se van de golpe cuatro avisos
   * de seguridad que el panel de Hostinger marcaba en rojo: el RCE crítico por
   * AVIF (GHSA-2xp9-vwfh-vxw4), el SSRF alto del optimizador, y las tres altas
   * de `sharp` —libvips, libheif y librsvg—, que solo son alcanzables por ahí.
   *
   * No es una renuncia: `next/image` no se importa en ningún archivo y la única
   * imagen del sitio es `public/logo-xtt.svg`, que el optimizador no toca de
   * todas formas. Antes había `formats: ['image/avif', 'image/webp']`, que sin
   * un solo `next/image` nunca llegó a hacer nada.
   *
   * Y a diferencia de actualizar, esto no caduca: la superficie desaparece en
   * vez de quedar parcheada hasta el siguiente aviso.
   *
   * Si algún día hace falta `next/image`, hay que quitar esto Y comprobar antes
   * que la versión de Next en uso tiene los parches del optimizador.
   */
  images: {
    unoptimized: true,
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],

    /**
     * Topes de paralelismo, y solo donde hacen falta.
     *
     * El hosting gestionado de Hostinger cortaba el build a los 15 minutos sin
     * dejar ni un error. En local el mismo build tarda 15 SEGUNDOS con 16
     * núcleos, y esa diferencia de 60× no la explica tener menos CPU: huele al
     * problema clásico de contenedores, donde el proceso ve los núcleos del
     * anfitrión y lanza docenas de workers sobre una cuota de uno.
     *
     * Van detrás de una variable en vez de fijos para no castigar los builds de
     * local y de CI, que sí tienen máquina. `scripts/report-build-env.mjs`
     * imprime los límites reales para que esto deje de ser una conjetura.
     */
    ...(process.env.NEXT_BUILD_CPUS
      ? {
          cpus: Number(process.env.NEXT_BUILD_CPUS),
          workerThreads: false,
          memoryBasedWorkersCount: false,
        }
      : {}),
  },

  // 301 desde las URLs del WordPress anterior. Ver src/config/redirects.ts.
  redirects: () => Promise.resolve(legacyRedirects),

  // El header sobra en cada respuesta y filtra la versión del framework.
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
