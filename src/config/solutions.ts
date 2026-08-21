import type { Solution, SolutionId } from './types';

/**
 * Las cuatro soluciones que orbitan el logo en el hero, en el orden en que Sergio
 * las enumeró en el brief.
 *
 * Nombres y descripciones NO viven aquí: son copy y van en `messages/{es,en}.json`
 * bajo `solutions.<id>`. Aquí solo vive lo estructural (orden, slug, ícono).
 *
 * PENDIENTE DE CONFIRMAR CON SERGIO: el brief decía "CCAS" y "SBCEs", que asumimos
 * typos de CCaaS y SBC (Session Border Controller). Ver README §Status.
 */
export const solutions: readonly Solution[] = [
  {
    id: 'ccaas',
    slug: { es: 'ccaas', en: 'ccaas' },
    icon: 'Headset',
  },
  {
    id: 'sbc-telecom-data',
    slug: { es: 'sbc-y-analisis-de-datos', en: 'sbc-and-telecom-data' },
    icon: 'ShieldCheck',
  },
  {
    id: 'messaging',
    slug: { es: 'mensajeria-y-canales-digitales', en: 'messaging-and-digital-channels' },
    icon: 'MessagesSquare',
  },
  {
    id: 'sip',
    slug: { es: 'telefonia-sip', en: 'sip-telephony' },
    icon: 'PhoneCall',
  },
] as const;

/** Índice por id. Evita el `.find()` repetido en cada componente. */
export const solutionById = (id: SolutionId): Solution | undefined =>
  solutions.find((solution) => solution.id === id);

/** Ángulo inicial de cada nodo en la órbita del hero, repartido en la circunferencia. */
export const orbitAngle = (index: number): number => (360 / solutions.length) * index;
