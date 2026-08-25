import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/PageHeader';
import { PresenceRegions } from '@/components/PresenceRegions';
import { buildPageMetadata } from '@/lib/metadata';

import { PartnerLocatorClient } from './PartnerLocatorClient';

interface LocaleParams {
  readonly locale: string;
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    namespace: 'partnerLocator',
    pathname: '/partner-locator',
  });
};

const PartnerLocatorPage = async ({ params }: { params: Promise<LocaleParams> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('partnerLocator');

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <PartnerLocatorClient />

      {/* La cobertura va después del directorio y no antes: mientras el listado
          esté vacío es lo único concreto que la página puede afirmar, pero
          cuando lleguen los partners el orden sigue siendo el correcto. */}
      <PresenceRegions />
    </>
  );
};

export default PartnerLocatorPage;
