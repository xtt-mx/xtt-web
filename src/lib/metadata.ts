import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import type { AppPathname } from '@/i18n/routing';

interface PageMetadataOptions {
  readonly locale: string;
  /** Namespace de mensajes del que salen `title` y `lead`. */
  readonly namespace: 'about' | 'solutions' | 'partnerLocator' | 'contact' | 'privacy';
  readonly pathname: AppPathname;
}

/**
 * Metadata de una página interior.
 *
 * Centraliza el canonical y los `hreflang` porque son justo lo que se olvida al
 * agregar una página: sin `alternates.languages`, Google trata las versiones ES
 * y EN como contenido duplicado en vez de como traducciones.
 *
 * Las rutas se resuelven con `getPathname`, no concatenando strings: el slug en
 * inglés es distinto (`/nosotros` → `/en/about`) y escribirlo a mano acaba
 * apuntando a un 404.
 */
export const buildPageMetadata = async ({
  locale,
  namespace,
  pathname,
}: PageMetadataOptions): Promise<Metadata> => {
  const t = await getTranslations({ locale, namespace });

  const title = t('title');
  const description = t('lead');

  const languages = Object.fromEntries(
    routing.locales.map((alternate) => [
      alternate,
      getPathname({ href: pathname, locale: alternate }),
    ]),
  );

  return {
    title,
    description,
    alternates: {
      canonical: getPathname({ href: pathname, locale }),
      languages,
    },
    openGraph: { title, description, type: 'website' },
  };
};
