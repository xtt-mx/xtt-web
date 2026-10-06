#!/usr/bin/env node
/**
 * Imprime los límites reales de la máquina que está construyendo.
 *
 * Corre antes de `next build` en el script `build:hostinger`, así que sus datos
 * salen en el registro a los pocos segundos aunque el build muera después. Eso
 * es justo el problema que viene a resolver: el hosting gestionado de Hostinger
 * corta a los 15 minutos y hasta ahora fallaba sin decir nada —ni un error, ni
 * una traza—, así que no había forma de saber contra qué se estaba peleando.
 *
 * Lo que se busca con esto: en un contenedor con cuota, los procesos suelen ver
 * los núcleos del ANFITRIÓN y no los suyos. Un build que cree tener 64 núcleos
 * lanza 64 workers sobre una cuota de uno, y lo que en un portátil tarda 15
 * segundos deja de terminar nunca. Si `availableParallelism` sale alto y la
 * cuota de `cpu.max` sale baja, eso es exactamente lo que está pasando.
 *
 * Node plano, sin dependencias, y nunca falla: si no puede leer algo lo dice y
 * sigue. Un diagnóstico que rompe el build es peor que no tenerlo.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';

const leer = (ruta) => {
  try {
    return readFileSync(ruta, 'utf8').trim();
  } catch {
    return null;
  }
};

const gb = (bytes) => `${(bytes / 1024 ** 3).toFixed(2)} GB`;

const linea = (etiqueta, valor) => console.log(`  ${etiqueta.padEnd(26)} ${valor}`);

console.log('\n── entorno de build ──────────────────────────────────────────');

linea('node', process.version);
linea('plataforma', `${process.platform} ${process.arch}`);

// `cpus().length` es lo que ve el proceso; `availableParallelism` es lo que Node
// cree que puede usar. Los dos pueden mentir dentro de un contenedor.
linea('cpus visibles', String(os.cpus().length));
linea('availableParallelism', String(os.availableParallelism?.() ?? '(no disponible)'));
linea('memoria total', gb(os.totalmem()));
linea('memoria libre', gb(os.freemem()));
linea(
  'carga (1 / 5 / 15 min)',
  os
    .loadavg()
    .map((n) => n.toFixed(2))
    .join(' / '),
);

// cgroup v2 primero, v1 como respaldo: es donde vive la cuota de verdad.
const memMax =
  leer('/sys/fs/cgroup/memory.max') ??
  leer('/sys/fs/cgroup/memory/memory.limit_in_bytes');
const cpuMax =
  leer('/sys/fs/cgroup/cpu.max') ?? leer('/sys/fs/cgroup/cpu/cpu.cfs_quota_us');

linea(
  'cgroup memory.max',
  memMax === null
    ? '(no legible)'
    : memMax === 'max'
      ? 'sin límite'
      : `${memMax} = ${gb(Number(memMax))}`,
);
linea('cgroup cpu.max', cpuMax ?? '(no legible)');

// La glibc del servidor es lo que decide qué versión de Next puede construir
// aquí. Hasta ahora la deducíamos del error; mejor leerla.
try {
  const salida = execFileSync('ldd', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  linea('glibc', salida.split('\n')[0].trim());
} catch {
  linea('glibc', '(ldd no disponible)');
}

if (process.env.NEXT_BUILD_CPUS) linea('NEXT_BUILD_CPUS', process.env.NEXT_BUILD_CPUS);

console.log('──────────────────────────────────────────────────────────────\n');
