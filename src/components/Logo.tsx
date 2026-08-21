import { brand } from '@/config/brand';
import { cn } from '@/lib/cn';

import styles from './Logo.module.css';

interface LogoProps {
  readonly className?: string;
  /** Reserva el nombre accesible para un ancestro (p. ej. el link del header). */
  readonly decorative?: boolean;
}

/**
 * Wordmark XTT.
 *
 * PROVISIONAL: es el wordmark compuesto tipográficamente mientras Sergio entrega
 * el vectorial oficial. El manual (pág. 6) prohíbe distorsionar el logo y esta
 * versión no reproduce su kerning exacto, así que NO debe llegar a producción.
 * Cuando llegue el .svg, este componente se reduce a un <svg> inline.
 *
 * El punto final es parte del logotipo, no puntuación.
 */
export const Logo = ({ className, decorative = false }: LogoProps) => (
  <span
    className={cn(styles.logo, className)}
    aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : brand.name}
  >
    {brand.wordmark}
  </span>
);
