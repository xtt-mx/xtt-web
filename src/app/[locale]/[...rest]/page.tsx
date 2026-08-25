import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

interface CatchAllParams {
  readonly locale: string;
  readonly rest: readonly string[];
}

/**
 * Sin `generateMetadata` a propósito.
 *
 * El título de la pestaña en un 404 acaba siendo el genérico del sitio, que no
 * es ideal, pero exportar metadata desde aquí es peor: `notFound()` aborta el
 * render y Next cae a la metadata del layout cuando la de la página ya se
 * emitió. El resultado son dos `<meta name="robots">` contradictorios y el
 * título por defecto igual. Comprobado, no supuesto.
 */

/**
 * Captura cualquier ruta que no exista y dispara el 404 del sitio.
 *
 * Hace falta porque Next solo renderiza `not-found.tsx` cuando `notFound()` se
 * llama **desde dentro** de un segmento, no para URLs desconocidas en general.
 * Sin este archivo, `/lo-que-sea` nunca entra en `[locale]` y el visitante ve
 * el 404 crudo de Next: sin header, sin footer, sin tema y en inglés.
 *
 * Es la solución que recomienda next-intl. La alternativa,
 * `experimental.globalNotFound` de Next 16, sigue siendo experimental y arrastra
 * un bug que cuelga el servidor de desarrollo en cuanto el archivo importa algo
 * (vercel/next.js#92256).
 *
 * `setRequestLocale` va antes del `notFound()`: sin él, la página de error se
 * renderiza sin locale resuelto y la copy sale en el idioma por defecto aunque
 * el visitante viniera de `/en`.
 */
const CatchAllPage = async ({ params }: { params: Promise<CatchAllParams> }) => {
  const { locale } = await params;
  setRequestLocale(locale);

  notFound();
};

export default CatchAllPage;
