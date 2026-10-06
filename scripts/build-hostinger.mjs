#!/usr/bin/env node
/**
 * Construye para el hosting gestionado de Hostinger.
 *
 *   pnpm build:hostinger
 *
 * No es el build normal, y las dos diferencias tienen motivo:
 *
 * 1. **webpack en vez de Turbopack.** El build moría a los 15 minutos —el tope
 *    del pipeline de Hostinger— atascado en «Creating an optimized production
 *    build», sin un error ni una traza. La compilación de Turbopack es Rust y su
 *    paralelismo no se puede limitar desde la configuración de Next; la de
 *    webpack sí. Turbopack es más rápido donde hay máquina: en local 15 s contra
 *    36 s. Aquí no hay máquina.
 *
 * 2. **Un tope de workers.** En local el build tarda 15 SEGUNDOS con 16 núcleos.
 *    Esa diferencia de 60× no la explica tener menos CPU, y apunta al problema
 *    clásico de contenedores: el proceso ve los núcleos del anfitrión y lanza
 *    docenas de workers sobre una cuota de uno.
 *
 * El tope se fija aquí y no en hPanel a propósito: una variable que alguien
 * tiene que acordarse de poner es una variable que se olvida, y olvidarla cuesta
 * otros 15 minutos de build. Se puede sobrescribir con `NEXT_BUILD_CPUS`.
 *
 * `scripts/report-build-env.mjs` imprime los límites reales del servidor para
 * que esto deje de ser una conjetura y pase a ser un número.
 */

import { spawnSync } from 'node:child_process';

const cpus = process.env.NEXT_BUILD_CPUS ?? '2';

const { status } = spawnSync('next', ['build', '--webpack'], {
  stdio: 'inherit',
  // `shell` hace falta en Windows para resolver el .cmd del binario.
  shell: process.platform === 'win32',
  env: { ...process.env, NEXT_BUILD_CPUS: cpus },
});

process.exit(status ?? 1);
