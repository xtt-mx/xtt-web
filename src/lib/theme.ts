export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'xtt-theme';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

/**
 * Script que corre ANTES del primer paint para evitar el flash de tema.
 *
 * Va inline y bloqueante en `<head>` a propósito: cualquier alternativa (efecto
 * de React, script diferido) corre después del primer paint, y el usuario ve un
 * destello blanco antes del tema oscuro. Es la única razón por la que aceptamos
 * un script inline en este proyecto.
 *
 * No toca `data-theme` cuando la preferencia es "system": ahí manda el media
 * query de `globals.css`, que ya cubre el caso sin JavaScript.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.dataset.theme=p}}catch(e){}})();`;

/**
 * Qué tema se está viendo ahora mismo, ya sea por elección explícita o porque el
 * sistema operativo lo dictó. Se lee del DOM y no de un estado de React: el
 * script inline y el media query ya resolvieron esto antes de que React exista,
 * y duplicarlo en estado solo abre la puerta a que las dos versiones diverjan.
 */
export const resolveTheme = (): ResolvedTheme => {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

interface ApplyThemeOptions {
  /** En `false` solo se refleja en el DOM. Lo usa la sincronización entre pestañas,
   *  donde el valor ya viene de localStorage y volver a escribirlo sería un eco. */
  readonly persist?: boolean;
}

/** Aplica la preferencia al DOM y la persiste. Única función que escribe `data-theme`. */
export const applyTheme = (
  preference: ThemePreference,
  { persist = true }: ApplyThemeOptions = {},
): void => {
  const root = document.documentElement;

  if (preference === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }

  if (!persist) return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Safari en modo privado lanza al tocar localStorage. Persistir es
    // best-effort; el tema de esta sesión ya quedó aplicado.
  }
};

/** Alterna entre claro y oscuro partiendo de lo que se está viendo. */
export const toggleTheme = (): void => {
  applyTheme(resolveTheme() === 'dark' ? 'light' : 'dark');
};
