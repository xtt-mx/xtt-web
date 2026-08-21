export type ThemePreference = 'light' | 'dark' | 'system';

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
 * Se mantiene diminuto y sin dependencias — se serializa tal cual al HTML, así
 * que cada byte se paga en todas las páginas.
 *
 * No toca `data-theme` cuando la preferencia es "system": ahí manda el media
 * query de `globals.css`, que ya cubre el caso sin JavaScript.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.dataset.theme=p}}catch(e){}})();`;

const readStoredTheme = (): ThemePreference => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    // Safari en modo privado lanza al tocar localStorage.
    return 'system';
  }
};

/* --------------------------------------------------------------------------
   Store externo
   `useSyncExternalStore` necesita que `getSnapshot` devuelva un valor estable
   entre renders: si leyéramos localStorage cada vez, React entraría en bucle.
   Por eso se cachea aquí y solo se invalida al escribir o al llegar un evento
   `storage` de otra pestaña.
   -------------------------------------------------------------------------- */

let cachedPreference: ThemePreference | null = null;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

export const subscribeToTheme = (listener: () => void): (() => void) => {
  listeners.add(listener);

  // Mantiene sincronizadas varias pestañas del sitio abiertas a la vez.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    cachedPreference = null;
    emit();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

export const getThemeSnapshot = (): ThemePreference => {
  cachedPreference ??= readStoredTheme();
  return cachedPreference;
};

/**
 * En el servidor no hay preferencia que leer. Devolver "system" hace que el HTML
 * renderizado coincida con el primer render del cliente y no haya mismatch de
 * hidratación; el tema visible ya lo aplicó el script inline.
 */
export const getThemeServerSnapshot = (): ThemePreference => 'system';

/** Aplica la preferencia al DOM y la persiste. Única función que escribe `data-theme`. */
export const applyTheme = (preference: ThemePreference): void => {
  const root = document.documentElement;

  if (preference === 'system') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Persistir es best-effort; el tema de esta sesión ya quedó aplicado.
  }

  cachedPreference = preference;
  emit();
};
