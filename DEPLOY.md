# Desplegar

Este sitio es un proceso de Node, no PHP. **No corre en hosting compartido.**
El WordPress anterior sí —`xtt.com.mx` está hoy en hPanel de Hostinger con
LiteSpeed— y por eso no vale el mismo plan.

---

## Dónde está hoy, y por qué no está en Hostinger

**En Vercel**, con contraseña, mientras la copy siga sin aprobar.

No es el plan original. Se probaron las dos vías de Hostinger y las dos se
cerraron:

| Vía                    | Qué pasó                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hosting gestionado** | El servidor no tiene `GLIBC_2.29`, así que el compilador nativo de Next 16 no carga. Turbopack **no** tiene respaldo en WebAssembly. Saldría a base de parches. |
| **VPS**                | La cuenta no tiene ninguno —una sola suscripción, Business Web Hosting— y crear uno es una compra.                                                              |

El plan de VPS sigue escrito y vigente (las cuatro secciones numeradas de abajo, más
`Dockerfile`, `docker-compose.yml`, `Caddyfile` y
`.github/workflows/deploy.yml`): el día que haya un servidor, funciona sin
cambios. Lo que falta es el servidor.

### Variables en Vercel

| Variable                                         | Valor                             |
| ------------------------------------------------ | --------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                           | la URL que asigne Vercel          |
| `PREVIEW_USER`                                   | el usuario de la previsualización |
| `PREVIEW_PASSWORD`                               | **en plano**, no el hash de Caddy |
| `N8N_CONTACT_WEBHOOK_URL` · `N8N_WEBHOOK_SECRET` | para el formulario de contacto    |

`NEXT_PUBLIC_SITE_URL` se incrusta en el bundle durante el build: cambiarla
obliga a **redesplegar**, no basta con guardarla.

### La contraseña la pone la aplicación, no el hosting

El plan gratuito de Vercel no ofrece protección por contraseña, así que la
puerta vive en `src/proxy.ts`. Se monta sola cuando existen `PREVIEW_USER` y
`PREVIEW_PASSWORD`, y en producción, donde no se definen, el sitio queda
abierto. **No hay bandera que acordarse de apagar.**

Dos consecuencias que conviene tener presentes:

- `/api/*` y los estáticos quedan fuera —el matcher del proxy los excluye, y
  cambiarlo rompe cuatro rutas; está documentado en `proxy.ts`—. En producción
  son públicos de todas formas.
- La contraseña va en plano porque el runtime edge no puede verificar un hash
  de bcrypt. No debe ser la misma que la de Caddy.

La suite entera de Playwright corre **con la puerta puesta**, y
`e2e/preview-gate.spec.ts` falla si alguien la abre sin querer. Comprobado al
revés: apuntando la suite a un servidor sin las variables, 8 de sus 10 tests
caen.

---

## Lo que hace falta

| Qué                 | Dónde                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| VPS con Docker      | Hostinger KVM 1 basta (1 vCPU, 4 GB), plantilla **Ubuntu 24.04 con Docker** |
| Clave SSH           | `ssh-keygen -t ed25519`; la pública se sube al crear el VPS                 |
| Deploy key del repo | El repo es privado; el VPS necesita leerlo                                  |
| Acceso al DNS       | **No está en Hostinger.** Ver abajo                                         |
| Secretos de n8n     | `N8N_CONTACT_WEBHOOK_URL`, `N8N_CHAT_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`     |

### Dónde vive cada pieza

Tres proveedores distintos, y la confusión habitual es creer que son uno. Todo
lo de abajo está verificado contra el dominio real.

```
REGISTRADOR ─── Key-Systems GmbH (whois.mx)
                alta 2018-09-10 · vence 2027-09-10
                    │  delega el DNS a
                    ▼
DNS ──────────── Google Cloud DNS          ← el interruptor está AQUÍ
                 ns-cloud-d1…d4.googledomains.com
                 SOA: cloud-dns-hostmaster.google.com
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   A 191.101.79.61         MX Google Workspace
   Hostinger compartido    el correo de la empresa
   (hPanel · LiteSpeed)         ↑
   WordPress + Elementor    NO SE TOCA
```

**Cambiar de sitio es cambiar un solo registro `A` en Google Cloud DNS.** Ni el
registrador ni Hostinger intervienen: el registrador solo manda si se quiere
mover el dominio o cambiar de nameservers, y Hostinger es solo a donde apunta
hoy ese registro.

> Los `MX` y el `TXT` del SPF viven en la misma zona. Tocarlos deja a XTT sin
> correo. Se cambia el `A` y nada más.

Key-Systems es un registrador **mayorista**: casi nunca vende al cliente final,
así que lo más probable es que XTT comprara el dominio a un revendedor suyo. La
vía rápida para saber a cuál es buscar en el correo los avisos de renovación de
principios de septiembre.

---

## 1 · Previsualizar sin tocar el DNS

Cada VPS de Hostinger trae un hostname gratis tipo `srv123456.hstgr.cloud` que
resuelve solo. Sirve para levantar el sitio real por HTTPS sin DNS y sin
comprar dominio.

```bash
cp .env.example .env     # y rellenar
```

Con `SITE_DOMAIN=srv123456.hstgr.cloud` y
`NEXT_PUBLIC_SITE_URL=https://srv123456.hstgr.cloud`, más el usuario y el hash
de la contraseña:

```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'la-que-sea'
```

```bash
docker compose -f docker-compose.yml -f docker-compose.preview.yml up -d --build
```

El override es lo que pone la contraseña y el `X-Robots-Tag`. **No se despliega
una previsualización sin él**: las páginas salen como `index, follow` y un
`hstgr.cloud` abierto acaba indexado compitiendo con el sitio real.

---

## 2 · Despliegue continuo desde GitHub

Un VPS no trae la integración con GitHub del panel de _Websites_: ahí no hay
botón de «conectar repositorio». El enlace lo monta
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que se dispara
cuando **CI termina en verde**, no cuando empujas:

```
push a main → lint · typecheck · build → Playwright → deploy (ssh al VPS)
                                   └── en rojo: no se despliega nada
```

Eso es mejor que el panel gestionado, que publica lo que empujaste sin mirar si
pasa los tests.

El workflow solo abre el SSH; el trabajo lo hace
[`scripts/deploy-remote.sh`](scripts/deploy-remote.sh), que **viaja por stdin**
en vez de ejecutarse desde el clon del servidor. Así el script que corre es el
de la revisión validada, no el que dejó el despliegue anterior.

Tres cosas que hace y conviene saber:

- Hace `reset --hard` **al SHA que CI validó**, no a la punta de `main`. Entre
  que CI acaba y el deploy arranca pueden haber entrado commits sin probar.
- Usa `--wait`, que se apoya en el `HEALTHCHECK` del `Dockerfile`. Sin él,
  `up -d` da éxito en cuanto el contenedor arranca, aunque se caiga enseguida.
- Si el arranque falla, **vuelve solo** a la revisión anterior y la levanta.

### Preparar el servidor (una vez)

**Son dos claves distintas, y confundirlas cuesta un rato.** Una para entrar al
VPS y otra para que el VPS pueda leer el repo, que es privado.

| Clave                         | Parte privada           | Parte pública                         |
| ----------------------------- | ----------------------- | ------------------------------------- |
| **A** · Actions → VPS         | Secret `DEPLOY_SSH_KEY` | `~/.ssh/authorized_keys` del VPS      |
| **B** · VPS → GitHub (clonar) | se queda en el VPS      | Repo → Settings → **Deploy keys**, RO |

En el VPS, con la clave B ya dada de alta:

```bash
sudo mkdir -p /srv && sudo chown "$USER" /srv
git clone git@github.com:xtt-mx/xtt-web.git /srv/xtt-web
cd /srv/xtt-web && cp .env.example .env    # y rellenar
```

El `.env` es quien decide el entorno, vía `COMPOSE_FILE`. El workflow corre
`docker compose up` a secas en los dos casos.

> El usuario del despliegue necesita poder hablar con Docker. Si no es `root`:
> `sudo usermod -aG docker "$USER"` y volver a entrar.

### Secretos y variables del repo

Settings → Environments → **`produccion`**:

| Nombre               | Tipo     | Qué es                                           |
| -------------------- | -------- | ------------------------------------------------ |
| `DEPLOY_HOST`        | secret   | `srv1827163.hstgr.cloud`                         |
| `DEPLOY_USER`        | secret   | el usuario del VPS                               |
| `DEPLOY_PORT`        | secret   | solo si no es el 22                              |
| `DEPLOY_SSH_KEY`     | secret   | clave **A**, privada, completa con sus cabeceras |
| `DEPLOY_KNOWN_HOSTS` | secret   | `ssh-keyscan -t ed25519 srv1827163.hstgr.cloud`  |
| `DEPLOY_URL`         | variable | `https://srv1827163.hstgr.cloud`                 |

`DEPLOY_KNOWN_HOSTS` no es opcional: la alternativa es
`StrictHostKeyChecking=no`, que convierte un secuestro de DNS en un despliegue
—y una clave— entregados al atacante.

El entorno `produccion` también es donde se le puede exigir **aprobación
manual** antes de cada despliegue, sin tocar el workflow.

> ⚠️ **Hay un Traefik ocupando los puertos 80 y 443 de ese VPS.** Está
> verificado: responde con su certificado por omisión. Caddy no va a poder
> escuchar ahí mientras siga levantado, así que el primer despliegue exige
> decidir una de dos — retirar Traefik, o publicar el sitio detrás de él y
> quitar el servicio `caddy` del compose. **No es algo que el workflow pueda
> resolver**; se decide al entrar al servidor.

---

## 3 · Apuntar el dominio

1. **24-48 h antes**, bajar el TTL del registro `A` a 300 s. Sin eso, una marcha
   atrás tarda horas.
2. Ensayar sin tocar nada: apuntar `xtt.com.mx` a la IP del VPS en el `hosts`
   local y recorrer el sitio entero.
3. `node scripts/check-redirects.mjs` — los 301 del WordPress viejo.
4. Cambiar el `.env` a producción y **reconstruir**:

   ```bash
   docker compose up -d --build
   ```

   `NEXT_PUBLIC_SITE_URL` se incrusta en el bundle durante el build; reiniciar
   el contenedor no la cambia.

5. En el DNS de Google, mover **solo el `A`** a la IP del VPS.
6. Caddy pide el certificado solo en cuanto propague.

### Marcha atrás

Devolver el `A` a `191.101.79.61`, que es el WordPress. **No lo borres**: es la
red de seguridad durante las primeras semanas.

---

## 4 · Comprobar

```bash
curl -sI https://xtt.com.mx | head -1          # 200 y HTTPS
curl -s  https://xtt.com.mx/api/health         # ok
curl -s  https://xtt.com.mx/robots.txt
dig +short MX xtt.com.mx                       # ← el importante: sigue Google
```

Y a mano: los dos idiomas, los dos temas, 375 px, el formulario de contacto de
punta a punta, una muestra de los 301 viejos, y que entre y salga un correo.

---

## Notas

- **El chat va apagado** (`NEXT_PUBLIC_CHAT_ENABLED=false`) hasta que el cliente
  apruebe la sección del aviso de privacidad. Las dos mitades van juntas a
  propósito: no debe existir un chat que guarde conversaciones sin que el aviso
  lo declare.
- **HSTS** solo en producción y solo después de validar el dominio por HTTPS. Si
  se activa antes y algo falla, los navegadores recuerdan el pin y dejan el
  sitio inaccesible. Por eso `Caddyfile.preview` no lo lleva.
- El hash de bcrypt contiene `$`. Al ejecutar `docker compose config` se ve
  escapado como `$$`; es cosa de cómo lo imprime Compose, el valor que llega a
  Caddy es el bueno.
- Los certificados los renueva Caddy solo. No hay cron que mantener.
