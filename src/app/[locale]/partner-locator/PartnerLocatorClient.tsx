'use client';

import { useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';

import { CoverageMap } from '@/components/CoverageMap';
import { coveredCountries } from '@/config/presence';
import { countriesWithPartners, partners } from '@/config/partners';
import { solutions } from '@/config/solutions';
import type { CountryCode, SolutionId } from '@/config/types';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { CoverageGeometry } from '@/lib/coverage-map';

import styles from './partner-locator.module.css';

/** Valor del `<option>` "Todos". No es un CountryCode ni un SolutionId válido. */
const ANY = 'all' as const;

type CountryFilter = CountryCode | typeof ANY;
type SolutionFilter = SolutionId | typeof ANY;

/**
 * Los países con partner no cambian en tiempo de ejecución: salen de
 * `src/config/partners.ts`. Se calcula una vez y no en cada render.
 */
const conPartner = countriesWithPartners();

interface PartnerLocatorClientProps {
  /** Trazados del mapa, proyectados en el servidor durante el build. */
  readonly geometry: CoverageGeometry;
}

export const PartnerLocatorClient = ({ geometry }: PartnerLocatorClientProps) => {
  const t = useTranslations('partnerLocator');
  const tCountry = useTranslations('presence.countries');
  const tSolution = useTranslations('solutions');
  const fieldId = useId();

  const [country, setCountry] = useState<CountryFilter>(ANY);
  const [solution, setSolution] = useState<SolutionFilter>(ANY);

  const results = useMemo(
    () =>
      partners.filter(
        (partner) =>
          (country === ANY || partner.country === country) &&
          (solution === ANY || partner.solutions.includes(solution)),
      ),
    [country, solution],
  );

  /**
   * La sección se nombra con su propio título y no con el contador de
   * resultados, que era lo que hacía antes: «Sin partners» es un nombre extraño
   * para una región, y ataba el nombre a un texto que ahora puede no estar.
   */
  return (
    <section className={styles.locator} aria-label={t('title')}>
      <div className={cn('container', styles.inner)}>
        {/* El mapa comparte el estado del `<select>`, no tiene el suyo: así los
            dos controles no pueden contradecirse nunca. */}
        <CoverageMap
          geometry={geometry}
          withPartners={conPartner}
          selected={country === ANY ? null : country}
          onSelect={(code) => setCountry(code ?? ANY)}
        />

        <form
          className={styles.filters}
          /* Sin submit: filtrar es instantáneo. El `form` está por semántica y
             para que los lectores de pantalla agrupen los dos controles. */
          onSubmit={(event) => event.preventDefault()}
        >
          <div className={styles.field}>
            <label className={cn('eyebrow', styles.label)} htmlFor={`${fieldId}-country`}>
              {t('filterCountry')}
            </label>
            <select
              id={`${fieldId}-country`}
              className={styles.select}
              value={country}
              onChange={(event) => setCountry(event.target.value as CountryFilter)}
            >
              <option value={ANY}>{t('filterAll')}</option>
              {coveredCountries.map((code) => (
                <option key={code} value={code}>
                  {tCountry(code)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label
              className={cn('eyebrow', styles.label)}
              htmlFor={`${fieldId}-solution`}
            >
              {t('filterSolution')}
            </label>
            <select
              id={`${fieldId}-solution`}
              className={styles.select}
              value={solution}
              onChange={(event) => setSolution(event.target.value as SolutionFilter)}
            >
              <option value={ANY}>{t('filterAll')}</option>
              {solutions.map((item) => (
                <option key={item.id} value={item.id}>
                  {tSolution(`${item.id}.name`)}
                </option>
              ))}
            </select>
          </div>

          {/* Solo cuando hay algo que contar. Con cero resultados decía «Sin
              partners» justo encima del bloque que ya lo explica y además
              ofrece salida: repetir la mala noticia en dos sitios no informa,
              insiste.

              `aria-live` y no un `role="status"` aparte: el conteo ES el
              resumen, y anunciarlo dos veces obligaría a mantener dos textos
              sincronizados. */}
          {results.length > 0 && (
            <p
              id={`${fieldId}-results`}
              className={cn('mono', styles.count)}
              aria-live="polite"
            >
              {t('resultsCount', { count: results.length })}
            </p>
          )}
        </form>

        {results.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{t('empty')}</p>
            <Link href="/contacto" className={cn('btn', 'btn-primary')}>
              {t('emptyCta')}
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {results.map((partner) => (
              <li key={`${partner.country}-${partner.name}`} className={styles.partner}>
                <div className={styles.partnerHead}>
                  <h2 className={cn('display', styles.partnerName)}>{partner.name}</h2>
                  <span className={cn('mono', styles.tier)}>
                    {t(`tier.${partner.tier}`)}
                  </span>
                </div>

                <p className={cn('mono', styles.place)}>
                  {partner.city}, {tCountry(partner.country)}
                </p>

                <ul className={styles.tags}>
                  {partner.solutions.map((id) => (
                    <li key={id} className={styles.tag}>
                      {tSolution(`${id}.name`)}
                    </li>
                  ))}
                </ul>

                {partner.website !== undefined && (
                  <a
                    className={styles.site}
                    href={partner.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('visitSite')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
