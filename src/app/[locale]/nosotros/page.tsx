import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/PageHeader';
import { brand } from '@/config/brand';
import { cn } from '@/lib/cn';
import { buildPageMetadata } from '@/lib/metadata';

import styles from './nosotros.module.css';

interface LocaleParams {
  readonly locale: string;
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPageMetadata({ locale, namespace: 'about', pathname: '/nosotros' });
};

const AboutPage = async ({ params }: { params: Promise<LocaleParams> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('about');

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <section className={cn('container', styles.body)}>
        <p className={styles.bodyText}>{t('body')}</p>

        {/* El año en operación va en la display condensada: es el único dato duro
            de la página y merece leerse como cifra, no como una línea más. */}
        <aside className={styles.since}>
          <p className="eyebrow">{t('foundedLabel')}</p>
          <p className={cn('display', styles.sinceYear)}>{brand.foundedYear}</p>
        </aside>
      </section>

      {/* Misión y visión NO son dos tarjetas iguales lado a lado: se alternan y
          se separan con hairlines, para que se lean como dos declaraciones y no
          como celdas de una tabla. */}
      <section className={styles.statements}>
        <article className={cn('container', styles.statement)}>
          <h2 className={cn('eyebrow', 'section-label', styles.statementLabel)}>
            {t('missionTitle')}
          </h2>
          <p className={cn('display', styles.statementText)}>{t('mission')}</p>
        </article>

        <article className={cn('container', styles.statement, styles.statementAlt)}>
          <h2 className={cn('eyebrow', 'section-label', styles.statementLabel)}>
            {t('visionTitle')}
          </h2>
          <p className={cn('display', styles.statementText)}>{t('vision')}</p>
        </article>
      </section>
    </>
  );
};

export default AboutPage;
