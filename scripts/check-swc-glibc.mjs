#!/usr/bin/env node
/**
 * Comprueba que el binario nativo de SWC que trae Next pueda ejecutarse en el
 * servidor de Hostinger.
 *
 *   node scripts/check-swc-glibc.mjs
 *
 * --- Por qué existe ---
 *
 * El hosting gestionado de Hostinger corre sobre un sistema cuya glibc no llega
 * a 2.29. El binario de la línea 16.3 de Next exige 2.30, así que no carga; Next
 * cae al respaldo en WebAssembly y el build muere al no poder ni leer
 * `next.config.ts`. El síntoma no se parece en nada a la causa, y se perdieron
 * dos despliegues en encontrarla.
 *
 * Por eso esto mide el BINARIO y no la versión: una lista de versiones buenas
 * hay que mantenerla, y nadie se acuerda. Así seguirá valiendo cuando salga
 * Next 17.
 *
 * Node plano, sin dependencias: es una herramienta de operación y no debe
 * depender de que el proyecto esté construido.
 */

import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * El techo del servidor.
 *
 * Está razonado, no elegido: el registro del build dice
 * «version `GLIBC_2.29' not found», y las versiones de glibc son acumulativas,
 * así que el servidor tiene 2.28 como máximo. Lo único DEMOSTRADO que funciona
 * allí es 2.17 (Next 16.2); si algún día vuelve a fallar por glibc, baja esto.
 */
const GLIBC_MAXIMO = [2, 28];

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const existe = async (ruta) => {
  try {
    await stat(ruta);
    return true;
  } catch {
    return false;
  }
};

/**
 * Localiza el binario de linux-x64-gnu.
 *
 * pnpm solo instala el binario de la plataforma, así que en Windows y macOS no
 * está y no hay nada que medir. En CI sí, porque `ubuntu-latest` es Linux —que
 * es exactamente donde importa—, y además ya está instalado: esto no descarga
 * nada.
 */
const buscarBinario = async () => {
  const directo = join(
    RAIZ,
    'node_modules/@next/swc-linux-x64-gnu/next-swc.linux-x64-gnu.node',
  );
  if (await existe(directo)) return directo;

  // Con pnpm el paquete puede estar solo dentro del almacén virtual.
  const almacen = join(RAIZ, 'node_modules/.pnpm');
  if (!(await existe(almacen))) return null;

  for (const entrada of await readdir(almacen)) {
    if (!entrada.startsWith('@next+swc-linux-x64-gnu@')) continue;
    const candidato = join(
      almacen,
      entrada,
      'node_modules/@next/swc-linux-x64-gnu/next-swc.linux-x64-gnu.node',
    );
    if (await existe(candidato)) return candidato;
  }

  return null;
};

/**
 * Saca la versión de glibc más alta que exige el ELF.
 *
 * Se lee por trozos porque el binario pasa de 130 MB y cargarlo entero solo para
 * buscar unas cadenas es gratuito en memoria pero tonto. El solape de 32 bytes
 * evita perder una cadena partida justo en la frontera de dos trozos.
 */
const glibcExigida = async (ruta) => {
  const patron = /GLIBC_(\d+)\.(\d+)/g;
  let maxima = [0, 0];
  let cola = '';

  for await (const trozo of createReadStream(ruta, { highWaterMark: 8 * 1024 * 1024 })) {
    const texto = cola + trozo.toString('latin1');
    for (const [, mayor, menor] of texto.matchAll(patron)) {
      const v = [Number(mayor), Number(menor)];
      if (v[0] > maxima[0] || (v[0] === maxima[0] && v[1] > maxima[1])) maxima = v;
    }
    cola = texto.slice(-32);
  }

  return maxima;
};

const binario = await buscarBinario();

if (!binario) {
  console.log(
    '· check-swc-glibc: se salta — el binario de linux-x64-gnu no está instalado\n' +
      '  en esta plataforma. En CI (Linux) sí corre, que es donde importa.',
  );
  process.exit(0);
}

const exigida = await glibcExigida(binario);
const comoTexto = (v) => v.join('.');
const cabe =
  exigida[0] < GLIBC_MAXIMO[0] ||
  (exigida[0] === GLIBC_MAXIMO[0] && exigida[1] <= GLIBC_MAXIMO[1]);

if (!cabe) {
  console.error(
    `\n✗ El SWC de esta versión de Next exige glibc ${comoTexto(exigida)}, y el` +
      ` servidor\n  de Hostinger no pasa de ${comoTexto(GLIBC_MAXIMO)}.` +
      ' El build fallará allí.\n\n' +
      '  No es un aviso teórico: con Next 16.3 el build muere sin poder leer\n' +
      '  next.config.ts, y el error no menciona la glibc hasta el final.\n\n' +
      '  Qué hacer: volver a una versión de Next cuyo binario quepa (16.2.12\n' +
      '  exige 2.17) o, si Hostinger ha actualizado el sistema, subir\n' +
      '  GLIBC_MAXIMO en este archivo y dejar constancia de por qué.\n',
  );
  process.exit(1);
}

console.log(
  `✓ check-swc-glibc: el SWC exige glibc ${comoTexto(exigida)} y el servidor admite` +
    ` hasta ${comoTexto(GLIBC_MAXIMO)}.`,
);
