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

Internamente hay tres estados —`light`, `dark` y `system`— pero la UI expone **un
solo botón** que alterna claro ↔ oscuro. `system` es el estado inicial de quien
nunca lo toca; dejó de ser una posición seleccionable porque tres controles
cargaban demasiado el header.

- El script anti-FOUC (`src/lib/theme.ts` → `themeInitScript`) corre inline y
  bloqueante en `<head>`. Es el **único** script inline aceptable en este proyecto.
- **El tema no vive en estado de React.** `data-theme` en `<html>` es la única
  fuente de verdad, y `resolveTheme()` lo lee del DOM. Duplicarlo en un `useState`
  solo abre la puerta a que las dos versiones diverjan.
- **Nada que dependa del tema se decide en render.** El servidor no sabe qué tema
  tiene el visitante, así que cualquier marcado condicional produce mismatch de
  hidratación o un parpadeo. Los iconos del toggle se renderizan los dos y CSS
  muestra el que toca, con los mismos selectores que gobiernan los tokens.
  Corolario: las etiquetas accesibles son fijas ("Cambiar tema"), porque CSS no
  puede corregir texto.
- El modo claro se **diseña**, no se invierte. Cualquier sección nueva se revisa en
  los dos temas antes de dar por terminada.

## Logotipo

`public/logo-xtt.svg` es el wordmark dentro de su marco cuadrado, en un solo
`<path>` sin fondo. Se pinta como **máscara CSS sobre `currentColor`**, no como
`<img>`: así hereda `--color-fg` y sale negro en claro y blanco en oscuro con un
único archivo, que es exactamente lo que el manual describe como las dos versiones.

El tamaño lo fija el consumidor con `--logo-size`, nunca el componente.

### De dónde salió ese SVG

⚠️ Es una **reconstrucción**, no el archivo maestro de la marca.

Los dos archivos que entregó XTT el 2026-08-21 (`BWhite.svg` y `Black.svg`) no eran
vectoriales: cada uno era un PNG de 500×500 en base64 dentro de un envoltorio
`<svg>` —cero `<path>`, un solo `<image>`— más un `<rect>` de fondo opaco.

Para obtener el vector actual se extrajo el PNG, se recortó al bounding box de la
marca (284×284 de los 500×500; el resto era aire), se escaló 4× y se vectorizó con
potrace. El resultado difiere del original en **0.73 %** de los pixeles, que son
bordes de antialiasing.

Escala sin perder nitidez y sirve para producción, pero las curvas no son las que
dibujó el diseñador original. El ticket del vectorial oficial sigue abierto; cuando
llegue, se reemplaza `public/logo-xtt.svg` y no hace falta tocar código.

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
