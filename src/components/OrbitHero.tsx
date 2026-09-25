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
 * —el giro, la profundidad, la niebla, las estrellas y los pulsos— es CSS. Meter
 * JS aquí costaría hidratación en el elemento que define el LCP a cambio de
 * nada.
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

          {/* DOS elipses, sin inclinar y concéntricas. Antes eran tres con dos
              inclinaciones distintas (−8°, 0°, +6°) buscando huir del cliché de
              los anillos concéntricos; en pantalla no leían como un plano
              orbital sino como tres óvalos mal alineados cruzándose en sitios
              arbitrarios. El cliché que hay que evitar es el anillo PUNTEADO, no
              el concéntrico. La tercera, además, vivía detrás del núcleo.

              `rx`/`ry` de la principal tienen que seguir a `--rx`/`--ry` del CSS
              (32 % y 19 % de 200), o los nodos dejan de pisar la línea. */}
          <svg
            className={styles.rings}
            viewBox="0 0 200 200"
            aria-hidden="true"
            focusable="false"
          >
            {/* El trazo se apaga donde la elipse se aleja. Una línea de gris
                plano deja el óvalo plano; atenuarla arriba —que es la mitad que
                se va al fondo— es lo que la convierte en un plano inclinado, y
                no cuesta ni un objeto más en escena.

                El id no lo toca CSS Modules, así que lleva prefijo a mano. */}
            <defs>
              <linearGradient id="xtt-orbit-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className={styles.ringFadeFar} />
                <stop offset="55%" className={styles.ringFadeMid} />
                <stop offset="100%" className={styles.ringFadeNear} />
              </linearGradient>
            </defs>

            <ellipse className={styles.ringOuter} cx="100" cy="100" rx="88" ry="52" />
            <ellipse className={styles.ringMain} cx="100" cy="100" rx="64" ry="38" />

            {/* Tráfico moviéndose por la red.
                Un solo cometa, no dos: la cabeza brillante y corta, y detrás dos
                segmentos cada vez más largos y más tenues que hacen de cola. Con
                dos cometas la lectura se repartía y, sobre todo, solo uno puede
                gobernar el encendido de los nodos — dos ritmos de destello sin
                relación entre sí se leen como parpadeo, no como señal.

                El halo es una copia ancha y transparente, no un `<filter>`: un
                filtro SVG animándose cada frame es de lo más caro que se puede
                pedir.

                Ninguno lleva `pathLength`: el largo del guion va en unidades del
                viewBox contra el perímetro real. Ver `.pulse` en el CSS. */}
            <ellipse
              className={cn(styles.pulse, styles.pulseTailFar)}
              cx="100"
              cy="100"
              rx="64"
              ry="38"
            />
            <ellipse
              className={cn(styles.pulse, styles.pulseTailNear)}
              cx="100"
              cy="100"
              rx="64"
              ry="38"
            />
            <ellipse
              className={cn(styles.pulse, styles.pulseHalo)}
              cx="100"
              cy="100"
              rx="64"
              ry="38"
            />
            <ellipse className={styles.pulse} cx="100" cy="100" rx="64" ry="38" />
          </svg>

          <div className={styles.core}>
            <span className={styles.halo} aria-hidden="true" />
            <Logo decorative />
          </div>

          <ul className={styles.orbit} aria-label={t('orbitLabel')}>
            {solutions.map((solution, index) => {
              const Icon = SOLUTION_ICONS[solution.id];
              const angle = baseAngle(index, solutions.length);

              return (
                <li
                  key={solution.id}
                  className={styles.node}
                  style={
                    {
                      '--base': `${angle}deg`,
                      /**
                       * El mismo ángulo en VUELTAS y sin unidad. De aquí sale
                       * el momento exacto en que el cometa alcanza a este nodo;
                       * un `<angle>` no se puede dividir para obtener un tiempo,
                       * y por eso va también como número. Ver `.nodeInner` en el
                       * CSS, donde está la cuenta del batido.
                       */
                      '--base-turns': angle / 360,
                      '--i': index,
                    } as React.CSSProperties
                  }
                >
                  <span className={styles.spoke} aria-hidden="true" />
                  <Link
                    href={{ pathname: '/soluciones', hash: solution.id }}
                    className={styles.nodeInner}
                  >
                    <span className={styles.nodeIcon} aria-hidden="true">
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <span className={styles.nodeLabel}>
                      {tSolutions(`${solution.id}.name`)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};
