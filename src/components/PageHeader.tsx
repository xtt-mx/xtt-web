import { cn } from '@/lib/cn';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
}

/**
 * Encabezado de página interior: eyebrow, H1 y entradilla.
 *
 * Existe porque las cuatro secciones interiores abren igual, y repetir el
 * marcado garantizaba que tarde o temprano una quedara con otro ritmo vertical
 * o sin el `section-label`.
 */
export const PageHeader = ({ eyebrow, title, lead }: PageHeaderProps) => (
  <header className={styles.header}>
    <div className={cn('container', styles.inner)}>
      <p className={cn('eyebrow', 'section-label', styles.eyebrow)}>{eyebrow}</p>
      <h1 className={cn('display', styles.title)}>{title}</h1>
      <p className={cn('muted', styles.lead)}>{lead}</p>
    </div>
  </header>
);
