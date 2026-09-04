import { getTranslations } from 'next-intl/server';

import { Logo } from '@/components/Logo';
import { SOLUTION_ICONS } from '@/components/solutionIcons';
import { solutions } from '@/config/solutions';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

import styles from './OrbitHero.module.css';

/**
 * Hero: el wordmark XTT al centro con las cuatro soluciones orbitando.
 *
 * Server component: ni estado ni interacción en JavaScript. Todo el movimiento
 * —el giro, la profundidad, la niebla, las estrellas, los pulsos y la pausa al
 * pasar el cursor— es CSS. Meter JS aquí costaría hidratación en el elemento que
 * define el LCP a cambio de nada.
 *
 * En viewports angostos la órbita NO se encoge: se sustituye por una lista con
 * hairlines (ver el media query del CSS). Una órbita de 320 px deja las
 * etiquetas ilegibles y encimadas; es el error clásico de este patrón.
 */

/**
 * De dónde arranca el reparto. Con 0° los cuatro nodos caen en cruz —arriba,
 * derecha, abajo, izquierda— y el conjunto se lee como una rosa de los vientos.
 * Este desfase los saca de los ejes y hace que parezca una órbita capturada a
 * media vuelta.
 */
const START_ANGLE = -68;

/**
 * Lo ÚNICO que el componente calcula: el ángulo de salida de cada nodo.
 *
 * La elipse, la profundidad y el apilado se resuelven en CSS con `sin()` y
 * `cos()` sobre `--spin`, la propiedad registrada que gira en el escenario. Que
 * la trigonometría viva allá y no aquí es lo que permite que UNA sola animación
 * mueva las cuatro soluciones, y que el ángulo base siga siendo válido cuando el
 * navegador no puede animar (ver el comentario de `@property` en `globals.css`).
 */
const baseAngle = (index: number, total: number): number =>
  START_ANGLE + (360 / total) * index;

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
          <div className={styles.backdrop} aria-hidden="true">
            <span className={styles.fog} />
            <span className={cn(styles.fog, styles.fogAlt)} />
            <span className={cn(styles.stars, styles.starsFar)} />
            <span className={cn(styles.stars, styles.starsMid)} />
            <span className={cn(styles.stars, styles.starsNear)} />
            <span className={styles.grid} />
          </div>

          {/* Las elipses van en UN solo SVG y no en tres divs con border-radius:
              `non-scaling-stroke` mantiene la línea en 1 px real a cualquier
              tamaño del escenario, y `pathLength` normaliza el perímetro a 100
              para que el pulso se exprese en porcentaje de vuelta. */}
          <svg
            className={styles.rings}
            viewBox="0 0 200 200"
            aria-hidden="true"
            focusable="false"
          >
            <ellipse
              className={styles.ringOuter}
              cx="100"
              cy="100"
              rx="90"
              ry="41"
              transform="rotate(-8 100 100)"
            />
            <ellipse
              className={styles.ringInner}
              cx="100"
              cy="100"
              rx="48"
              ry="22"
              transform="rotate(6 100 100)"
            />
            <ellipse className={styles.ringMain} cx="100" cy="100" rx="70" ry="34" />

            {/* Tráfico moviéndose por la red: dos arcos de luz persiguiéndose por
                la órbita principal a distinta velocidad. El halo es una copia de
                trazo ancho y transparente, no un `<filter>`: un filtro SVG
                animándose cada frame es de lo más caro que se puede pedir. */}
            <ellipse
              className={cn(styles.pulse, styles.pulseHalo)}
              cx="100"
              cy="100"
              rx="70"
              ry="34"
              pathLength="100"
            />
            <ellipse
              className={styles.pulse}
              cx="100"
              cy="100"
              rx="70"
              ry="34"
              pathLength="100"
            />
            <ellipse
              className={cn(styles.pulse, styles.pulseSlow)}
              cx="100"
              cy="100"
              rx="70"
              ry="34"
              pathLength="100"
            />
          </svg>

          <div className={styles.core}>
            <span className={styles.halo} aria-hidden="true" />
            <Logo decorative />
          </div>

          <ul className={styles.orbit} aria-label={t('orbitLabel')}>
            {solutions.map((solution, index) => {
              const Icon = SOLUTION_ICONS[solution.id];

              return (
                <li
                  key={solution.id}
                  className={styles.node}
                  style={
                    {
                      '--base': `${baseAngle(index, solutions.length)}deg`,
                      '--i': index,
                    } as React.CSSProperties
                  }
                >
                  <span className={styles.spoke} aria-hidden="true" />
                  <span className={styles.nodeInner}>
                    <span className={styles.nodeIcon} aria-hidden="true">
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <span className={styles.nodeLabel}>
                      {tSolutions(`${solution.id}.name`)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};
