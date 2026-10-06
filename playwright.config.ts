import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

/**
 * La suite corre con la puerta de previsualización PUESTA, no quitada.
 *
 * Es la condición en la que vive el sitio hoy —desplegado y con contraseña— y la
 * única forma de que un refactor de `src/proxy.ts` que abra la puerta en silencio
 * se note: lo caza `preview-gate.spec.ts`. Si en cambio la cierra de más, fallan
 * todas las demás, que es un grito en vez de un susurro.
 *
 * El resto de los specs no saben que existe: Playwright responde al 401 con estas
 * credenciales por su cuenta.
 */
const PREVIEW_USER = 'xtt';
const PREVIEW_PASSWORD = 'suite-de-pruebas';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: './e2e/.report' }]],

  fullyParallel: true,
  // Un `test.only` olvidado no debe pasar la revisión silenciosamente.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: BASE_URL,
    httpCredentials: { username: PREVIEW_USER, password: PREVIEW_PASSWORD },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],

  // Levanta el servidor solo si no hay uno escuchando ya.
  webServer: {
    command: 'pnpm build && pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      /**
       * El chat se prueba encendido aunque en producción siga apagado a la
       * espera de que el cliente apruebe el aviso de privacidad. Si la suite
       * corriera con la bandera de producción, las pruebas del widget se
       * saltarían solas y la función llegaría al día del lanzamiento sin que
       * nadie la haya ejercitado nunca.
       *
       * Enciende también la sección del chat en el aviso; `privacidad.spec.ts`
       * cuenta con ella.
       */
      NEXT_PUBLIC_CHAT_ENABLED: 'true',

      // Enciende la puerta de `src/proxy.ts`. Ver el comentario de arriba.
      PREVIEW_USER,
      PREVIEW_PASSWORD,
    },
  },
});
