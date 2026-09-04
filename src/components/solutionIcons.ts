import { Headset, MessagesSquare, PhoneCall, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { SolutionId } from '@/config/types';

/**
 * Ícono por solución.
 *
 * Vive aquí y no en `src/config` porque ese directorio no puede importar runtime
 * de React (ver CLAUDE.md). Guardar el nombre como string allá y resolverlo en
 * tiempo de ejecución rompería el tree-shaking de lucide, así que el mapa es
 * estático y explícito: si se agrega una solución, TypeScript exige su ícono.
 *
 * Se extrajo de `SolutionRow` cuando la órbita del hero pasó a usar los mismos
 * íconos: dos mapas separados habrían divergido en la primera solución nueva.
 */
export const SOLUTION_ICONS: Record<SolutionId, LucideIcon> = {
  ccaas: Headset,
  'sbc-telecom-data': ShieldCheck,
  messaging: MessagesSquare,
  sip: PhoneCall,
};
