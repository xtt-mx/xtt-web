import { Headset, MessagesSquare, PhoneCall, ShieldCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { LucideIcon } from 'lucide-react';

import type { Solution, SolutionId } from '@/config/types';
import { cn } from '@/lib/cn';

import styles from './SolutionRow.module.css';

/**
 * Ícono por solución.
 *
 * Vive aquí y no en `src/config` porque ese directorio no puede importar runtime
 * de React (ver CLAUDE.md). Guardar el nombre como string allá y resolverlo en
 * tiempo de ejecución rompería el tree-shaking de lucide, así que el mapa es
 * estático y explícito: si se agrega una solución, TypeScript exige su ícono.
 */
const ICONS: Record<SolutionId, LucideIcon> = {
  ccaas: Headset,
  'sbc-telecom-data': ShieldCheck,
  messaging: MessagesSquare,
  sip: PhoneCall,
};

interface SolutionRowProps {
  readonly solution: Solution;
  readonly index: number;
}

export const SolutionRow = async ({ solution, index }: SolutionRowProps) => {
  const t = await getTranslations('solutions');
  const Icon = ICONS[solution.id];

  return (
    <li
      className={cn(styles.row, index % 2 === 1 && styles.rowAlt)}
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className={cn('container', styles.inner)}>
        <div className={styles.aside}>
          {/* Numeral tipográfico, no un badge de color: ordena sin gritar. */}
          <span className={cn('display', styles.number)}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <Icon size={26} strokeWidth={1.5} className={styles.icon} aria-hidden="true" />
        </div>

        <div className={styles.content}>
          <h2 className={cn('display', styles.name)}>{t(`${solution.id}.name`)}</h2>
          <p className={cn('mono', styles.full)}>{t(`${solution.id}.full`)}</p>
          <p className={styles.summary}>{t(`${solution.id}.summary`)}</p>
          <p className={cn('muted', styles.detail)}>{t(`${solution.id}.detail`)}</p>
        </div>
      </div>
    </li>
  );
};
