import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Wrappers de next-intl sobre los helpers de Next. Se importan SIEMPRE desde aquí
 * y nunca desde `next/link` o `next/navigation`: son los que resuelven el pathname
 * traducido y conservan el locale al navegar.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
