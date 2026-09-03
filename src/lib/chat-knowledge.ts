import { brand } from '@/config/brand';
import { partners } from '@/config/partners';
import { regions } from '@/config/presence';
import { solutions } from '@/config/solutions';
import type { CountryCode, Locale } from '@/config/types';

import en from '../../messages/en.json';
import es from '../../messages/es.json';

/**
 * Corpus que el chatbot recibe como system prompt.
 *
 * No se redacta: se DERIVA de la copy que ya existe. `messages/{es,en}.json` y
 * `src/config/` son la fuente de verdad del sitio, así que el bot no puede
 * desincronizarse de lo que el visitante lee — cambia un `detail` en el JSON y
 * la respuesta cambia en el siguiente deploy, sin tocar n8n.
 *
 * La alternativa era pegar el prompt a mano en el workflow. Envejece en
 * silencio, no queda en git y nadie se entera de que el bot describe una
 * solución que ya se reescribió.
 *
 * Son ~10 KB por idioma. No hace falta trocear ni indexar: entra completo y
 * OpenAI cachea los prefijos estables de más de 1024 tokens, así que el bloque
 * se paga una vez y no en cada turno.
 */

/**
 * Forma mínima que el corpus necesita de los mensajes.
 *
 * Tiparlo así no es ceremonia: es lo que hace que falte una clave en `en.json`
 * rompa el `typecheck` en vez de producir un `undefined` que el modelo lee como
 * texto vacío. Es la regla de CLAUDE.md —toda clave existe en los dos idiomas—
 * aplicada por el compilador.
 */
interface SiteMessages {
  readonly about: {
    readonly title: string;
    readonly lead: string;
    readonly body: string;
    readonly mission: string;
    readonly vision: string;
  };
  readonly solutions: Readonly<
    Record<
      (typeof solutions)[number]['id'],
      {
        readonly name: string;
        readonly full: string;
        readonly summary: string;
        readonly detail: string;
      }
    >
  > & {
    readonly lead: string;
  };
  readonly presence: {
    readonly lead: string;
    readonly regions: Readonly<Record<(typeof regions)[number]['id'], string>>;
    readonly countries: Readonly<Record<CountryCode, string>>;
  };
  readonly partnerLocator: {
    readonly lead: string;
    readonly empty: string;
  };
}

const MESSAGES: Readonly<Record<Locale, SiteMessages>> = { es, en };

/**
 * Encabezados de las secciones del corpus.
 *
 * Son andamiaje para el modelo, no copy —por eso no viven en `messages/`—, pero
 * sí van traducidos: un documento con los títulos en español y los párrafos en
 * inglés empuja al modelo a mezclar los dos idiomas en la respuesta, que es
 * justo lo que la regla 1 intenta evitar.
 */
const HEADINGS: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  es: {
    context: 'CONTEXTO',
    about: `Sobre ${brand.name}`,
    solutions: 'Soluciones que distribuye',
    presence: 'Dónde opera',
    partners: 'Partners',
    contact: 'Datos de contacto',
    mission: 'Misión',
    vision: 'Visión',
    operating: `En operación desde ${brand.foundedYear}.`,
    phone: 'Teléfono',
    email: 'Correo',
    office: 'Oficina',
  },
  en: {
    context: 'CONTEXT',
    about: `About ${brand.name}`,
    solutions: 'Solutions it distributes',
    presence: 'Where it operates',
    partners: 'Partners',
    contact: 'Contact details',
    mission: 'Mission',
    vision: 'Vision',
    operating: `Operating since ${brand.foundedYear}.`,
    phone: 'Phone',
    email: 'Email',
    office: 'Office',
  },
};

const { address } = brand.contact;

/**
 * Reglas de comportamiento. Van aquí y no en n8n por la misma razón que el
 * corpus: son producto, se revisan en PR y cambian con el sitio.
 *
 * La regla que más importa es la de no inventar. Un bot institucional que
 * improvisa un precio o promete una cobertura que no existe crea una expectativa
 * que alguien de XTT tiene que desmentir después.
 */
export const chatRules = (locale: Locale): string => {
  const pageLanguage = locale === 'es' ? 'español' : 'inglés';

  return [
    `Eres el asistente del sitio web de ${brand.name} (${brand.legalName}).`,
    '',
    'REGLAS:',
    '1. Responde en el MISMO idioma en que te escriban. Si la pregunta llega en',
    '   inglés, contesta en inglés aunque el CONTEXTO esté en otro idioma, y al',
    `   revés. Si el idioma no queda claro, usa ${pageLanguage}, que es el de la`,
    '   página.',
    '2. No mezcles idiomas dentro de una respuesta. En español evita el término',
    '   en inglés cuando exista el equivalente. Los nombres propios de producto',
    '   son la excepción y se escriben tal cual: "Contact Center as a Service",',
    '   "CCaaS", "SBC", "WhatsApp", "SIP".',
    '3. Responde únicamente con la información del CONTEXTO de abajo. No la',
    '   completes con conocimiento general sobre telecomunicaciones ni sobre',
    '   otras empresas.',
    '4. Si la respuesta no está en el CONTEXTO, dilo con franqueza e invita a',
    '   usar el formulario de contacto. Es preferible admitir que no lo sabes a',
    '   improvisar algo verosímil.',
    '5. NUNCA escribas rutas ni direcciones web: nada de "/contacto", "/contact"',
    '   ni "xtt.com.mx/...". La ventana del chat ya muestra un botón permanente',
    '   que lleva al formulario, así que menciónalo con palabras ("el formulario',
    '   de contacto", "el botón de aquí abajo") y nunca como una ruta. Escrita,',
    '   una ruta no es clicable y se lee como un error.',
    '6. Nunca des precios, plazos de entrega, condiciones comerciales ni',
    '   disponibilidad. XTT los cotiza caso por caso: remite al formulario.',
    '7. No pidas datos personales. Si la persona quiere dejar sus datos o que la',
    '   contacten, remítela al formulario en vez de recogerlos en el chat.',
    '8. Sé breve: dos o tres frases salvo que te pidan detalle. Esto es una',
    '   ventana de chat, no una página.',
    '9. No inventes nombres de partners, clientes ni casos de éxito.',
    '10. Si te preguntan algo ajeno a XTT, dilo y reconduce.',
  ].join('\n');
};

const solutionsSection = (m: SiteMessages): string =>
  solutions
    .map((solution) => {
      const copy = m.solutions[solution.id];
      return [`### ${copy.name} — ${copy.full}`, copy.summary, copy.detail].join('\n');
    })
    .join('\n\n');

const presenceSection = (m: SiteMessages): string =>
  regions
    .map((region) => {
      const names = region.countries.map((code) => m.presence.countries[code]);
      return `- ${m.presence.regions[region.id]}: ${names.join(', ')}`;
    })
    .join('\n');

/**
 * Estado real del directorio de partners.
 *
 * Hoy `partners` está vacío a propósito (ver el comentario del módulo), y el bot
 * tiene que decir eso y no inventarse una red de canales. Cuando Sergio entregue
 * el listado, esta función empieza a describirlo sola.
 */
const partnersSection = (m: SiteMessages): string => {
  if (partners.length === 0) {
    return `${m.partnerLocator.lead}\n${m.partnerLocator.empty}`;
  }

  return [
    m.partnerLocator.lead,
    ...partners.map(
      (partner) =>
        `- ${partner.name} (${m.presence.countries[partner.country]}, ` +
        `${partner.city}) — ${partner.tier}`,
    ),
  ].join('\n');
};

export const buildKnowledge = (locale: Locale): string => {
  const m = MESSAGES[locale];
  const h = HEADINGS[locale];

  return [
    h.context,
    '',
    `## ${h.about}`,
    m.about.title,
    m.about.lead,
    m.about.body,
    `${h.mission}: ${m.about.mission}`,
    `${h.vision}: ${m.about.vision}`,
    h.operating,
    '',
    `## ${h.solutions}`,
    m.solutions.lead,
    '',
    solutionsSection(m),
    '',
    `## ${h.presence}`,
    m.presence.lead,
    presenceSection(m),
    '',
    `## ${h.partners}`,
    partnersSection(m),
    '',
    `## ${h.contact}`,
    `${h.phone}: ${brand.contact.phone}`,
    `${h.email}: ${brand.contact.email}`,
    `${h.office}: ${address.street}, ${address.detail}, ${address.postalCode} ` +
      `${address.city}, ${address.state}.`,
    /**
     * La ruta del formulario NO entra aquí. Estando en el contexto, el modelo la
     * copiaba en la respuesta —"visita /contacto"—, que ni es clicable ni se lee
     * como algo que un humano escribiría. El enlace ya está permanente en el pie
     * del panel; la regla 5 le dice al modelo que lo mencione con palabras.
     */
  ].join('\n');
};
