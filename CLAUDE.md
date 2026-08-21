# CLAUDE.md — reglas de este repo

Sitio institucional de XTT. Next.js 16 (App Router), React 19, TypeScript estricto,
bilingüe ES/EN, desplegado en un VPS de Hostinger.

## Lo que NO se hace aquí

Estas prohibiciones existen porque el encargo pedía explícitamente que el sitio no
se viera generado por IA. Cada una corresponde a un tell conocido:

- **Nada de shadcn/ui ni Radix.** Los componentes se escriben a mano en `src/components`.
- **Nada de framer-motion.** El movimiento es CSS con tokens de duración y easing.
- **Nada de utilidades de Tailwind en el JSX.** Tailwind v4 está solo por su `@theme`,
  que genera los tokens. El estilo por componente va en un CSS Module co-localizado.
- **Ningún color literal fuera de `globals.css`.** Si un CSS Module necesita un color
  nuevo, primero se agrega el token. Hay un test que falla si aparece un hex suelto.
- **Ninguna cadena de UI escrita en JSX.** Toda la copy vive en `messages/es.json` y
  `messages/en.json`. Si agregas texto, agregas la clave en los dos idiomas.
- **Nada de cuatro tarjetas iguales en grid** como layout por defecto. Los layouts son
  asimétricos a propósito; ver `.inner` en `OrbitHero.module.css` y `Footer.module.css`.

## Color y contraste

El manual de marca (pág. 5) restringe el **logotipo** a blanco y negro, pero las
págs. 9–11 autorizan colores de acompañamiento. Se eligió la rampa azul. El verde
está reservado a las marcas Khomp y Playvox: no se usa como acento global.

Regla que no se negocia:

| Token                 | Valor                              | Uso permitido                                  |
| --------------------- | ---------------------------------- | ---------------------------------------------- |
| `--color-accent`      | `#0A2DFF`                          | **Solo relleno.** Texto blanco encima (7.3:1). |
| `--color-accent-text` | `#0A2DFF` claro / `#6A85FF` oscuro | Texto y links de acento.                       |

`#0A2DFF` como color de texto sobre `#0B0B0B` da ~2.9:1 y **no pasa**. Por eso son
dos tokens y no uno. `e2e/theme.spec.ts` falla si algún nodo con texto propio usa el
azul base como `color` en tema oscuro.

## Temas

Tres estados: `light`, `dark`, `system` (default). La elección explícita se guarda en
`localStorage` y se estampa como `data-theme` en `<html>`; sin elección, manda
`prefers-color-scheme`.

- El script anti-FOUC (`src/lib/theme.ts` → `themeInitScript`) corre inline y
  bloqueante en `<head>`. Es el **único** script inline aceptable en este proyecto.
- El estado se lee con `useSyncExternalStore`, no con `useEffect` + `setState`:
  localStorage es un sistema externo y leerlo desde un efecto provoca renders en
  cascada (y el lint de React 19 lo marca como error).
- El modo claro se **diseña**, no se invierte. Cualquier sección nueva se revisa en
  los dos temas antes de dar por terminada.

## Convenciones de código

- `const` + arrow para todo, excepto los `export default` de `page.tsx`/`layout.tsx`.
- Named exports en componentes; `type` para uniones, `interface` para objetos.
- `as const` en los objetos de configuración. Separadores numéricos (`50_000`).
- `import type` explícito. `?? ''` en vez de `|| ''`.
- Comillas simples, punto y coma, 90 columnas (lo aplica Prettier).
- Los comentarios explican **por qué**, no qué. Solo donde no es obvio.
- Toda escape hatch (`dangerouslySetInnerHTML`, un cast, un `!`) lleva su
  justificación en línea. Si no puedes justificarla, no la metas.

## Arquitectura

- **`page.tsx` es siempre server component**: solo `await params`, `setRequestLocale`
  y `generateMetadata`. La interactividad vive en un `*Client.tsx` co-localizado.
- **`src/config/` es la única fuente de verdad** de marca, navegación, soluciones,
  presencia, partners y redirects. Nada de esos datos se escribe en un componente.
  Ese directorio no importa runtime de React ni de Next.
- **Navegación siempre desde `@/i18n/navigation`**, nunca desde `next/link` o
  `next/navigation`: son los wrappers que resuelven el pathname traducido.
- Los `href` se tipan contra `AppPathname`. Una ruta inexistente no compila.

## Antes de dar algo por terminado

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e
```

Y a mano: tema claro, tema oscuro, 375 px, y un recorrido completo con teclado.
