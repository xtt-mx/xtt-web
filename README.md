# XTT — sitio institucional

Reemplazo del WordPress de `xtt.com.mx` por un sitio propio: Next.js 16, bilingüe
ES/EN, tema claro/oscuro, desplegado en el VPS de Hostinger que XTT ya paga.

## TL;DR

- **Qué es:** sitio de marca de XTT, mayorista de soluciones CX y telecom para México,
  Centroamérica, el Caribe y Colombia.
- **Correr:** `pnpm install && pnpm dev` → http://localhost:3000
- **Idiomas:** español en la raíz (`/nosotros`), inglés prefijado (`/en/about`).
- **Temas:** un botón en el header alterna claro ↔ oscuro; sin tocarlo, manda el sistema.
- **Tests:** `pnpm test:e2e` — 42 pasando, 2 proyectos (escritorio y móvil).
- **Reglas del repo:** [CLAUDE.md](CLAUDE.md). Léelo antes del primer PR.
- **Estado:** home, Nosotros y Soluciones listas. Ver [Status & completeness](#status--completeness)
  para la lista honesta de lo que falta.

## El detalle que confunde una vez

El manual de marca dice que XTT es "blanco y negro", y eso es cierto **del logotipo**
(pág. 5). Las págs. 9–11 autorizan explícitamente colores de acompañamiento; se eligió
la rampa azul, cuyo tope es `#0A2DFF`. El verde del manual está reservado a las marcas
Khomp y Playvox y **no** se usa como acento del sitio.

Consecuencia práctica: `#0A2DFF` **no** sirve como color de texto sobre el fondo oscuro
(~2.9:1). Por eso hay dos tokens, `--color-accent` (relleno) y `--color-accent-text`
(tipografía). Hay un test que lo vigila.

## Estructura

```
src/
  app/
    [locale]/          layout, page, not-found — todo server component
    api/health/        healthcheck del contenedor
    globals.css        tokens (@theme), temas, primitivas globales
    fonts.ts           League Gothic · Lato · Roboto Mono (todas del manual)
  components/          escritos a mano, CSS Module co-localizado
  config/              fuente de verdad: marca, nav, soluciones, presencia, partners
  i18n/                routing, navegación tipada, carga de mensajes
  lib/                 cn(), sistema de temas
public/logo-xtt.svg    logotipo vectorial, usado como máscara CSS
messages/              es.json · en.json — TODA la copy
e2e/                   Playwright
```

## Quick start

| Comando          | Qué hace                                          |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo en :3000                   |
| `pnpm build`     | Build de producción (`output: standalone`)        |
| `pnpm lint`      | ESLint, `--max-warnings=0`                        |
| `pnpm typecheck` | `tsc --noEmit`                                    |
| `pnpm format`    | Prettier sobre todo el repo                       |
| `pnpm test:e2e`  | Playwright (levanta el server solo si no hay uno) |

Node 22 (ver `.nvmrc`), pnpm 11.

## Despliegue

VPS de Hostinger con Docker: `web` (Next standalone) detrás de `caddy`, que resuelve
TLS solo. `docker compose up -d --build` con un `.env` derivado de `.env.example`.

El corte se hace en dos tiempos: primero `nuevo.xtt.com.mx` apuntando al VPS para
validar, y solo después se mueve el A record de `xtt.com.mx`. El WordPress se deja
intacto y apagado 30 días como rollback.

Los 301 desde las URLs viejas están en `src/config/redirects.ts` y se verifican con:

```bash
node scripts/check-redirects.mjs https://nuevo.xtt.com.mx
```

## Status & completeness

Lectura honesta para handoff: **~40% hacia el lanzamiento**. Las fundaciones están y
son sólidas, y tres de los cinco apartados del nav ya existen. Falta el Partner
Locator, Contacto y el SEO.

### ✅ Funcionando de punta a punta

| Área            | Estado                                                                       |
| --------------- | ---------------------------------------------------------------------------- |
| Design system   | Tokens light/dark, tipografía del manual, primitivas, motion tokenizado      |
| Temas           | Un botón claro/oscuro, sin FOUC, persistente, sincronizado entre pestañas    |
| i18n            | ES/EN con slugs traducidos, sin autodetección, switcher que conserva la ruta |
| Home            | Hero orbital en CSS puro, degrada a lista en móvil, respeta reduced-motion   |
| Header / Footer | Nav de 5 apartados, menú móvil con Escape y bloqueo de scroll, skip link     |
| Nosotros        | Misión y visión en layout espejado, cifra de fundación, metadata por locale  |
| Soluciones      | Las 4 líneas en filas alternadas con hairlines, numeradas, no un grid        |
| Ruteo           | Matcher del proxy con regresión propia: páginas, route handlers y estáticos  |
| Tooling         | ESLint 9 flat, Prettier, husky, commitlint, CI con lint/typecheck/build/e2e  |
| Redirects       | 28 rutas del WordPress mapeadas, con script de verificación                  |

### ⚠️ Cableado, sin verificar contra la realidad

| Área              | Hecho                                                                              | Falta                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker / Caddy    | Dockerfile multi-stage, compose, healthcheck, TLS automático                       | Nunca se corrió en el VPS real. Falta el acceso SSH.                                                                                                 |
| SMTP de contacto  | `.env.example` documentado, endpoint pendiente                                     | Credenciales reales; probar entrega y spam                                                                                                           |
| Metadata / OG     | `metadataBase`, títulos, canonicals, hreflang                                      | Falta la imagen OG; hoy no hay ninguna                                                                                                               |
| Logo              | Vector real trazado del entregable del cliente, como máscara CSS que sigue el tema | Los archivos que entregó XTT eran PNG dentro de un `<svg>`; este trazo difiere 0.73 % del original pero **no es el archivo maestro de la marca**.    |
| Branch protection | CI, CODEOWNERS y plantillas de PR listas                                           | GitHub rechaza proteger `main` en repos privados sin plan Pro. Hoy nada impide un push directo. Se resuelve con Pro (~4 USD/mes) o abriendo el repo. |

### 🔲 No construido todavía (deliberado)

| Área                                                    | Prioridad               | Esfuerzo  |
| ------------------------------------------------------- | ----------------------- | --------- |
| Presencia + Partner Locator (SVG de la región, filtros) | Alta                    | 3–4 d     |
| Página y endpoint de Contacto (Zod, SMTP, antispam)     | Alta                    | 1–2 d     |
| `robots.ts`, `sitemap.ts`, JSON-LD                      | Media                   | medio día |
| Página de aviso de privacidad (migrar del WordPress)    | Media — requisito legal | medio día |
| Imágenes OG y favicon                                   | Media                   | medio día |
| Lighthouse CI con presupuesto de performance            | Baja                    | medio día |

### Bloqueado por el cliente

Nada de lo anterior avanza del todo sin esto:

1. **Logo XTT en vectorial de verdad** (`.svg` o `.ai`). Lo entregado el 2026-08-21 era PNG dentro de un `<svg>`; hoy se sirve un trazo reconstruido.
2. **Listado real de partners**: nombre, país, ciudad, soluciones, sitio, tier.
3. **Confirmar nombres de soluciones.** El brief decía "CCAS" y "SBCEs"; se asumió
   CCaaS y SBC. Está marcado en `src/config/solutions.ts`.
4. **Aprobar la copy** de Quiénes somos, Misión y Visión. La actual está redactada
   partiendo del WordPress vigente y reposicionada a "mayorista", pero es propuesta.
5. **Acceso SSH al VPS**, DNS de `xtt.com.mx` y una cuenta SMTP.
6. **Traducción al inglés**: la de `messages/en.json` es borrador y necesita revisión.

### Lo que haría a continuación, en orden

1. Cerrar el contenido con Sergio (bloquea las fases 4–6).
2. Nosotros + Soluciones, que son copy pura y desbloquean el `test.fixme` del switcher.
3. Partner Locator, la pieza más grande y la única con lógica de verdad.
4. Contacto con SMTP real, y verificar entrega antes de anunciar el sitio.
5. SEO (sitemap, robots, JSON-LD, OG) y recién ahí, el corte de DNS.
