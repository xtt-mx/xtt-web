import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

import styles from './not-found.module.css';

/**
 * Se renderiza cuando `notFound()` se llama dentro de `[locale]`, que para las
 * URLs desconocidas ocurre en el catch-all de `[...rest]`.
 */
const NotFound = async () => {
  const t = await getTranslations('notFound');

  return (
    <section className={cn('container', styles.wrap)}>
      <p className={cn('eyebrow', 'section-label', styles.code)}>{t('code')}</p>
      <h1 className={cn('display', styles.title)}>{t('title')}</h1>
      <p className={cn('muted', styles.lead)}>{t('lead')}</p>
      <Link href="/" className={cn('btn', 'btn-primary')}>
        {t('cta')}
      </Link>
    </section>
  );
};

export default NotFound;
