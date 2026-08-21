'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { navItems } from '@/config/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

import styles from './Header.module.css';

export const Header = () => {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Cerrar al navegar: sin esto el panel queda abierto sobre la página nueva.
  // Se ajusta durante el render comparando contra el pathname anterior —el patrón
  // que documenta React para resetear estado ante un cambio de prop— en lugar de
  // un efecto, que dispararía un render en cascada tras cada navegación.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMenuOpen(false);
  }

  // Bloquear el scroll del fondo mientras el panel móvil está abierto.
  useEffect(() => {
    if (!isMenuOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className={styles.header}>
      <a href="#contenido" className={styles.skip}>
        {t('skipToContent')}
      </a>

      <div className={cn('container-wide', styles.inner)}>
        <Link href="/" className={styles.brand} aria-label={t('home')}>
          <Logo decorative />
        </Link>

        <nav className={styles.nav} aria-label={t('primaryLabel')}>
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(styles.link, pathname === item.href && styles.linkActive)}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className={styles.controls}>
          <LocaleSwitcher />
          <ThemeToggle />
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={isMenuOpen}
            aria-controls="menu-movil"
            aria-label={isMenuOpen ? t('closeMenu') : t('openMenu')}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Siempre montado y solo oculto: así el `hidden` anuncia el cambio de estado
          a los lectores de pantalla sin desmontar el foco a media interacción. */}
      <div id="menu-movil" className={styles.mobilePanel} hidden={!isMenuOpen}>
        <nav className={styles.mobileNav} aria-label={t('mobileLabel')}>
          {navItems.map((item, index) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.mobileLink}
              style={{ '--i': index } as React.CSSProperties}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
