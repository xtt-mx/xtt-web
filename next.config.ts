import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

import { legacyRedirects } from './src/config/redirects';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Imagen final chica en el VPS: el runner solo copia .next/standalone.
  output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // 301 desde las URLs del WordPress anterior. Ver src/config/redirects.ts.
  redirects: () => Promise.resolve(legacyRedirects),

  // El header sobra en cada respuesta y filtra la versión del framework.
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
