import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

const NotFound = async () => {
  const t = await getTranslations('notFound');

  return (
    <section className="container" style={{ paddingBlock: '120px' }}>
      <p className={cn('eyebrow', 'section-label')}>{t('code')}</p>
      <h1
        className="display"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginBlock: '18px' }}
      >
        {t('title')}
      </h1>
      <p className="muted" style={{ maxWidth: '46ch', marginBottom: '28px' }}>
        {t('lead')}
      </p>
      <Link href="/" className="btn btn-primary">
        {t('cta')}
      </Link>
    </section>
  );
};

export default NotFound;
