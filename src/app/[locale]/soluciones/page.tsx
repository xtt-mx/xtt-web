import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/PageHeader';
import { SolutionRow } from '@/components/SolutionRow';
import { solutions } from '@/config/solutions';
import { buildPageMetadata } from '@/lib/metadata';

import styles from './soluciones.module.css';

interface LocaleParams {
  readonly locale: string;
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPageMetadata({ locale, namespace: 'solutions', pathname: '/soluciones' });
};

const SolutionsPage = async ({ params }: { params: Promise<LocaleParams> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('solutions');

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      {/* Lista y no grid: son cuatro líneas de negocio con orden y jerarquía,
          no cuatro opciones equivalentes en un tablero. */}
      <ol className={styles.list}>
        {solutions.map((solution, index) => (
          <SolutionRow key={solution.id} solution={solution} index={index} />
        ))}
      </ol>
    </>
  );
};

export default SolutionsPage;
