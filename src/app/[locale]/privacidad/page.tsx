import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { PageHeader } from '@/components/PageHeader';
import { isChatEnabled } from '@/config/chat';
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

/**
 * Las mismas secciones más la del chat, que se intercala tras "Compartir
 * información" porque es donde el texto ya habla de terceros.
 *
 * Se escribe entera y no como un `splice` sobre la anterior por la misma razón
 * que la lista de arriba es explícita: el orden es parte del texto legal y debe
 * poder leerse de un vistazo, no deducirse de aritmética de índices.
 */
const SECTIONS_WITH_CHAT = [
  'collect',
  'use',
  'share',
  'chat',
  'security',
  'rights',
  'changes',
  'contact',
] as const;

/**
 * El aviso describe el chat solo mientras el chat exista. Van detrás de la misma
 * bandera para que no pueda quedar publicada una de las dos mitades: ni un chat
 * que recoge conversaciones sin declararlo, ni un aviso que describe algo que el
 * visitante no tiene delante.
 */
const sections: readonly string[] = isChatEnabled ? SECTIONS_WITH_CHAT : SECTIONS;

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

          {sections.map((section) => (
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
