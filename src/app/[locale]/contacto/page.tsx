import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { ContactFormClient } from '@/app/[locale]/contacto/ContactFormClient';
import { PageHeader } from '@/components/PageHeader';
import { brand } from '@/config/brand';
import { cn } from '@/lib/cn';
import { buildPageMetadata } from '@/lib/metadata';

import styles from './contacto.module.css';

interface LocaleParams {
  readonly locale: string;
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> => {
  const { locale } = await params;
  return buildPageMetadata({ locale, namespace: 'contact', pathname: '/contacto' });
};

const ContactPage = async ({ params }: { params: Promise<LocaleParams> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('contact');
  const { address } = brand.contact;

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      {/* Formulario y datos directos en proporción desigual: el formulario es la
          acción principal, los datos son la salida alterna para quien prefiere
          escribir o llamar. */}
      <section className={cn('container', styles.layout)}>
        <ContactFormClient />

        <aside className={styles.direct}>
          <h2 className={cn('eyebrow', 'section-label')}>{t('directTitle')}</h2>

          <dl className={styles.details}>
            <dt className={cn('mono', styles.term)}>{t('phoneLabel')}</dt>
            <dd className={styles.value}>
              <a href={`tel:${brand.contact.phoneHref}`} className={styles.link}>
                {brand.contact.phone}
              </a>
            </dd>

            <dt className={cn('mono', styles.term)}>{t('emailLabel')}</dt>
            <dd className={styles.value}>
              <a href={`mailto:${brand.contact.email}`} className={styles.link}>
                {brand.contact.email}
              </a>
            </dd>

            <dt className={cn('mono', styles.term)}>{t('addressLabel')}</dt>
            <dd className={cn('muted', styles.value)}>
              {address.street}
              <br />
              {address.detail}
              <br />
              {address.postalCode} {address.city}, {address.state}
            </dd>
          </dl>
        </aside>
      </section>
    </>
  );
};

export default ContactPage;
