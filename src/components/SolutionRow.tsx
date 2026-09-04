import { getTranslations } from 'next-intl/server';

import { SOLUTION_ICONS } from '@/components/solutionIcons';
import type { Solution } from '@/config/types';
import { cn } from '@/lib/cn';

import styles from './SolutionRow.module.css';

interface SolutionRowProps {
  readonly solution: Solution;
  readonly index: number;
}

export const SolutionRow = async ({ solution, index }: SolutionRowProps) => {
  const t = await getTranslations('solutions');
  const Icon = SOLUTION_ICONS[solution.id];

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
