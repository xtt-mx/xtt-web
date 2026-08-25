import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/PageHeader';
import { buildPageMetadata } from '@/lib/metadata';

import styles from './privacidad.module.css';

interface LocaleParams {
  readonly locale: string;
}

/**
 * Orden de las secciones tal como estaban en `/politicas-de-privacidad-xtt`.
 *
 * Es una lista explícita y no `Object.keys` sobre los mensajes: el orden de un
 * texto legal es parte del texto, y dejarlo a merced del orden de un JSON lo
 * volvería reordenable por accidente.
 */
const SECTIONS = [
  'collect',
  'use',
  'share',
  'security',
  'rights',
  'changes',
  'contact',
] as const;

export const generateMetadata = async ({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPageMetadata({ locale, namespace: 'privacy', pathname: '/privacidad' });
};

const PrivacyPage = async ({ params }: { params: Promise<LocaleParams> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('privacy');
  const currentLocale = await getLocale();

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <article className={styles.legal}>
        <div className={styles.inner}>
          <p className={styles.updated}>
            <span className="mono">{t('updatedLabel')}</span> {t('updated')}
          </p>

          {/* La versión en español es la que rige: el original es ese y una
              traducción no puede crear obligaciones distintas. */}
          {currentLocale === 'en' && <p className={styles.governing}>{t('governing')}</p>}

          <p className={styles.intro}>{t('intro')}</p>

          {SECTIONS.map((section) => (
            <section key={section} className={styles.section}>
              <h2 className={styles.heading}>{t(`sections.${section}.title`)}</h2>
              <p className={styles.body}>{t(`sections.${section}.body`)}</p>

              {section === 'contact' && (
                <p className={styles.body}>
                  <a className={styles.email} href={`mailto:${t('contactEmail')}`}>
                    {t('contactEmail')}
                  </a>
                </p>
              )}
            </section>
          ))}

          <p className={styles.acceptance}>{t('acceptance')}</p>
        </div>
      </article>
    </>
  );
};

export default PrivacyPage;
