import { getTranslations } from 'next-intl/server';

import { regions } from '@/config/presence';
import { cn } from '@/lib/cn';

import styles from './PresenceRegions.module.css';

/**
 * Territorio comercial, agrupado por región.
 *
 * Las cuatro regiones tienen tamaños muy distintos —México es un país;
 * Centroamérica son siete— así que se listan como filas y no como tarjetas: un
 * grid de cuatro cajas iguales daría a entender que pesan lo mismo.
 */
export const PresenceRegions = async () => {
  const t = await getTranslations('presence');
  const tCountry = await getTranslations('presence.countries');

  return (
    <section className={styles.presence} aria-labelledby="presence-title">
      <div className={cn('container', styles.inner)}>
        <p className={cn('eyebrow', 'section-label')}>{t('eyebrow')}</p>
        <h2 className={cn('display', styles.title)} id="presence-title">
          {t('title')}
        </h2>
        <p className={cn('muted', styles.lead)}>{t('lead')}</p>

        <ul className={styles.regions}>
          {regions.map((region) => (
            <li key={region.id} className={styles.region}>
              <span className={cn('display', styles.regionName)}>
                {t(`regions.${region.id}`)}
              </span>

              {/* Se listan los países salvo cuando el nombre de la región YA ES
                  el del país —México—, donde repetirlo no agrega nada.

                  Se compara el texto y no el número de países, y la diferencia
                  importa desde que el cliente renombró «Colombia» a
                  «Sudamérica»: esa región sigue conteniendo un solo país, así
                  que contar la dejaría sin lista y el sitio nombraría un
                  continente sin decir dónde opera de verdad. */}
              {region.countries.some(
                (code) => tCountry(code) !== t(`regions.${region.id}`),
              ) && (
                <ul className={styles.countries}>
                  {region.countries.map((code) => (
                    <li key={code} className={cn('mono', styles.country)}>
                      {tCountry(code)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
