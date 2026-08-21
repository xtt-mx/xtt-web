import { getTranslations } from 'next-intl/server';

import { Logo } from '@/components/Logo';
import { brand } from '@/config/brand';
import { navItems, secondaryRoutes } from '@/config/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

import styles from './Footer.module.css';

export const Footer = async () => {
  const [t, tNav] = await Promise.all([
    getTranslations('footer'),
    getTranslations('nav'),
  ]);

  const { address } = brand.contact;

  return (
    <footer className={styles.footer}>
      <div className={cn('container-wide', styles.inner)}>
        <div className={styles.brandColumn}>
          <Logo decorative />
          <p className={cn('muted', styles.tagline)}>{t('tagline')}</p>
        </div>

        <nav className={styles.column} aria-label={t('sections')}>
          <h2 className="eyebrow">{t('sections')}</h2>
          {navItems.map((item) => (
            <Link key={item.key} href={item.href} className={styles.link}>
              {tNav(item.key)}
            </Link>
          ))}
        </nav>

        <address className={styles.column}>
          <h2 className="eyebrow">{brand.name}</h2>
          <a href={`tel:${brand.contact.phoneHref}`} className={styles.link}>
            {brand.contact.phone}
          </a>
          <a href={`mailto:${brand.contact.email}`} className={styles.link}>
            {brand.contact.email}
          </a>
          <p className={cn('muted', styles.address)}>
            {address.street}
            <br />
            {address.detail}
            <br />
            {address.postalCode} {address.city}, {address.state}
          </p>
        </address>
      </div>

      <div className={cn('container-wide', styles.legal)}>
        <p className={cn('mono', styles.copy)}>
          © {new Date().getFullYear()} {brand.legalName}. {t('rights')}
        </p>
        <Link href={secondaryRoutes.privacy} className={cn('mono', styles.copy)}>
          {t('privacy')}
        </Link>
      </div>
    </footer>
  );
};
