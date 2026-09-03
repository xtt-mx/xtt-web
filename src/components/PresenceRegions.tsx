import { getTranslations } from 'next-intl/server';

import { PresenceGlobe } from '@/components/PresenceGlobe';
import { regions } from '@/config/presence';
import { cn } from '@/lib/cn';

import styles from './PresenceRegions.module.css';

/**
 * Territorio comercial, agrupado por región.
 *
 * Las cuatro regiones tienen tamaños muy distintos —México y Colombia son un
 * país; Centroamérica son siete— así que se listan como filas y no como
 * tarjetas: un grid de cuatro cajas iguales daría a entender que pesan lo mismo.
 */
export const PresenceRegions = async () => {
  const t = await getTranslations('presence');
  const tCountry = await getTranslations('presence.countries');

  return (
    <section className={styles.presence} aria-labelledby="presence-title">
      <div className={cn('container', styles.inner)}>
        {/* El globo acompaña al encabezado, no a la lista. La lista es el
            contenido —cuatro regiones y sus países— y ocupa el ancho completo
            debajo; si el canvas se pusiera a su lado le robaría la jerarquía. */}
        <div className={styles.head}>
          <div className={styles.intro}>
            <p className={cn('eyebrow', 'section-label')}>{t('eyebrow')}</p>
            <h2 className={cn('display', styles.title)} id="presence-title">
              {t('title')}
            </h2>
            <p className={cn('muted', styles.lead)}>{t('lead')}</p>
          </div>

          <PresenceGlobe />
        </div>

        <ul className={styles.regions}>
          {regions.map((region) => (
            <li key={region.id} className={styles.region}>
              <span className={cn('display', styles.regionName)}>
                {t(`regions.${region.id}`)}
              </span>

              {/* México y Colombia son región de un solo país: su nombre ya es
                  el del país, y listarlo otra vez no agrega información. */}
              {region.countries.length > 1 && (
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
