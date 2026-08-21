import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ThemeProvider } from '@/components/ThemeProvider';
import { brand, siteUrl } from '@/config/brand';
import { fontVariables } from '@/app/fonts';
import { routing } from '@/i18n/routing';
import { themeInitScript } from '@/lib/theme';

import '../globals.css';

interface LocaleParams {
  readonly locale: string;
}

/** Prerenderiza ambos idiomas en build; sin esto cada locale se renderiza on-demand. */
export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t('defaultTitle'),
      template: `%s · ${brand.name}`,
    },
    description: t('defaultDescription'),
    applicationName: brand.name,
    authors: [{ name: brand.legalName }],
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}`,
      languages: {
        es: '/',
        en: '/en',
      },
    },
    openGraph: {
      type: 'website',
      siteName: brand.name,
      title: t('defaultTitle'),
      description: t('defaultDescription'),
      locale: locale === 'es' ? 'es_MX' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('defaultTitle'),
      description: t('defaultDescription'),
    },
    robots: { index: true, follow: true },
  };
};

/**
 * Dos entradas para que la barra del navegador móvil siga el tema en lugar de
 * quedarse fija en uno de los dos.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: brand.colors.light.bg },
    { media: '(prefers-color-scheme: dark)', color: brand.colors.dark.bg },
  ],
};

const LocaleLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LocaleParams>;
}) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Habilita el render estático de las páginas hijas bajo este locale.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        {/*
          Corre antes del primer paint para evitar el flash de tema. Es un string
          estático que escribimos nosotros —no entra nada del usuario—, por eso el
          inyectarlo así es seguro. Ver src/lib/theme.ts.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>
            <Header />
            <main id="contenido">{children}</main>
            <Footer />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
