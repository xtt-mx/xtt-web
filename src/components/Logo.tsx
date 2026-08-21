import { brand } from '@/config/brand';
import { cn } from '@/lib/cn';

import styles from './Logo.module.css';

interface LogoProps {
  readonly className?: string;
  /** Reserva el nombre accesible para un ancestro (p. ej. el link del header). */
  readonly decorative?: boolean;
}

/**
 * Logotipo XTT: el wordmark dentro de su marco cuadrado, según el manual.
 *
 * Se pinta como máscara CSS sobre `currentColor` en vez de como `<img>`. Así un
 * solo archivo cubre los dos temas —hereda `--color-fg`, que ya es negro en
 * claro y blanco en oscuro— y evita servir dos SVG y hacer swap por tema, que
 * es justo lo que el manual (pág. 5) describe como las dos versiones del logo.
 *
 * El tamaño lo fija quien lo usa vía `--logo-size`; el componente no decide
 * cuán grande va porque cambia entre header, hero y footer.
 */
export const Logo = ({ className, decorative = false }: LogoProps) => (
  <span
    className={cn(styles.logo, className)}
    role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : brand.name}
    aria-hidden={decorative || undefined}
  />
);
