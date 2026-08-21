#!/usr/bin/env node
/**
 * Verifica que cada URL del WordPress anterior siga devolviendo un 301 al destino
 * correcto. Se corre contra staging antes del corte de DNS y contra producción
 * después.
 *
 *   node scripts/check-redirects.mjs https://nuevo.xtt.com.mx
 *
 * Node plano, sin dependencias: es una herramienta de operación y no debe
 * depender de que el proyecto esté instalado.
 */

import { legacyRedirects } from '../src/config/redirects.ts';

const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

const results = await Promise.all(
  legacyRedirects.map(async ({ source, destination }) => {
    try {
      const response = await fetch(`${baseUrl}${source}`, { redirect: 'manual' });
      const location = response.headers.get('location') ?? '';
      const actual = location.replace(baseUrl, '') || '(sin Location)';
      const ok = response.status === 308 || response.status === 301;
      return {
        source,
        destination,
        status: response.status,
        actual,
        ok: ok && actual === destination,
      };
    } catch (error) {
      return { source, destination, status: 0, actual: String(error), ok: false };
    }
  }),
);

const failed = results.filter((result) => !result.ok);

for (const result of failed) {
  console.error(
    `✗ ${result.source} → ${result.actual} (${result.status}), se esperaba ${result.destination}`,
  );
}

console.log(`\n${results.length - failed.length}/${results.length} redirects correctos`);

if (failed.length > 0) process.exitCode = 1;
