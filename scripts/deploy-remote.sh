#!/usr/bin/env bash
# =====================================================================
# Despliegue en el VPS. Este script NO se corre en local: lo manda el
# workflow por stdin, así:
#
#   ssh vps "DEPLOY_SHA=… bash -s" < scripts/deploy-remote.sh
#
# Va por stdin y no se ejecuta desde el clon del servidor a propósito: lo
# que corre es el script de la revisión que CI validó, no el que hubiera
# quedado en el servidor de un despliegue anterior. Un script de
# despliegue que se actualiza a sí mismo a mitad del despliegue es una
# forma barata de perder una tarde.
# =====================================================================
set -euo pipefail

: "${DEPLOY_SHA:?falta DEPLOY_SHA}"
APP_DIR="${APP_DIR:-/srv/xtt-web}"

cd "$APP_DIR"

# La revisión que está sirviendo ahora mismo. Si el despliegue sale mal,
# aquí es donde volvemos.
ANTERIOR="$(git rev-parse HEAD)"

echo "→ desplegando ${DEPLOY_SHA:0:7} · ahora sirve ${ANTERIOR:0:7}"

git fetch --quiet origin main

# Fallar aquí y no a mitad del build si el commit no llegó al clon.
if ! git cat-file -e "${DEPLOY_SHA}^{commit}" 2>/dev/null; then
  echo "✗ el commit ${DEPLOY_SHA} no existe en este clon"
  exit 1
fi

# Al SHA exacto que CI validó, no a la punta de `main`: entre que CI terminó
# y esto arranca pueden haber entrado commits que nadie probó todavía.
git reset --hard --quiet "$DEPLOY_SHA"

# `COMPOSE_FILE` sale del .env del servidor, y es lo único que decide si esto
# es la previsualización o producción. Por eso el comando es idéntico en los
# dos entornos y este script no necesita saber en cuál está.
#
# `--wait` no es decorativo: usa el HEALTHCHECK del Dockerfile y devuelve
# error si el contenedor no llega a estar sano. Sin él, `up -d` da éxito en
# cuanto el contenedor arranca, aunque el proceso se caiga un segundo después.
levantar() { docker compose up --detach --build --wait --wait-timeout 300; }

if ! levantar; then
  echo "✗ el despliegue falló — volviendo a ${ANTERIOR:0:7}"
  git reset --hard --quiet "$ANTERIOR"
  levantar || echo "‼ la marcha atrás también falló: el sitio está caído"
  exit 1
fi

# Las capas huérfanas del build anterior. En un KVM chico el disco se llena
# en pocos despliegues si nadie las recoge.
docker image prune --force --filter 'dangling=true' >/dev/null

echo "✓ sirviendo $(git rev-parse --short HEAD)"
