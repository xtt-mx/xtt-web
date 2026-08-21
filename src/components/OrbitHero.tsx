import { getTranslations } from 'next-intl/server';

import { Logo } from '@/components/Logo';
import { solutions } from '@/config/solutions';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

import styles from './OrbitHero.module.css';

/**
 * Hero: el wordmark XTT al centro con las cuatro soluciones orbitando.
 *
 * Server component: no hay estado ni interacción, todo el movimiento es CSS. Meter
 * JS aquí costaría hidratación en el elemento que define el LCP a cambio de nada.
 *
 * En viewports angostos la órbita NO se encoge — se sustituye por una lista con
 * hairlines (ver el media query del CSS). Una órbita de 320 px deja las etiquetas
 * ilegibles y encimadas; es el error clásico de este patrón.
 */
export const OrbitHero = async () => {
  const [t, tSolutions] = await Promise.all([
    getTranslations('hero'),
    getTranslations('solutions'),
  ]);

  return (
    <section className={styles.hero}>
      <div className={cn('container-wide', styles.inner)}>
        <div className={styles.copy}>
          <p className={cn('eyebrow', 'section-label', styles.eyebrow)}>{t('eyebrow')}</p>
          <h1 className={cn('display', styles.title)}>{t('title')}</h1>
          <p className={cn('muted', styles.subtitle)}>{t('subtitle')}</p>

          <div className={styles.actions}>
            <Link href="/soluciones" className="btn btn-primary">
              {t('ctaPrimary')}
            </Link>
            <Link href="/contacto" className="btn btn-outline">
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>

        {/* La lista es la estructura real; la órbita es su presentación. Un lector
            de pantalla recorre cuatro items, no una figura decorativa. */}
        <div className={styles.stage}>
          <div className={styles.rings} aria-hidden="true">
            <span className={styles.ring} />
            <span className={cn(styles.ring, styles.ringInner)} />
          </div>

          <div className={styles.core}>
            <Logo decorative />
          </div>

          <ul className={styles.orbit} aria-label={t('orbitLabel')}>
            {solutions.map((solution, index) => (
              <li
                key={solution.id}
                className={styles.node}
                style={
                  {
                    '--angle': `${(360 / solutions.length) * index}deg`,
                    '--i': index,
                  } as React.CSSProperties
                }
              >
                <span className={styles.nodeInner}>
                  <span className={styles.nodeDot} aria-hidden="true" />
                  <span className={styles.nodeLabel}>
                    {tSolutions(`${solution.id}.name`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
