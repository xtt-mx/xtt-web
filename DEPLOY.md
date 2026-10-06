# Desplegar

Este sitio es un proceso de Node, no PHP, así que no vale el mismo alojamiento
que el WordPress anterior —`xtt.com.mx` sigue hoy en el hosting compartido de
Hostinger, con LiteSpeed—. Sí vale el **mismo plan**: el Business incluye una
sección de aplicaciones Node.js, y ahí es donde vive.

---

## Dónde vive el sitio

| Entorno        | Dónde                                                                                  | Para qué                                                             |
| -------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Producción** | Hostinger gestionado, sección **Websites** — `coral-hedgehog-358900.hostingersite.com` | el destino final; es lo que XTT paga, hasta 2030                     |
| **Pruebas**    | Vercel — <https://xtt-web.vercel.app>                                                  | ver un cambio antes de mandarlo a Hostinger, cuyo build es más lento |
| **VPS**        | aparcado                                                                               | ver la sección 2                                                     |

Vercel **no puede** ser el destino final: su plan gratuito es solo para uso no
comercial, y este es el sitio institucional de una empresa. Como entorno interno
no hay problema, porque el dominio nunca apunta ahí.

### Por qué falló Hostinger dos veces, y qué lo arregla

El build moría así, y el error no menciona la causa hasta el final:

```
⚠ @next/swc-linux-x64-gnu: /lib64/libm.so.6: version `GLIBC_2.29' not found
⨯ Failed to load next.config.ts
▲ Next.js 16.3.2 (Turbopack)
```

La causa, **medida** descargando los binarios y leyendo sus símbolos:

| Next                                 | glibc que exige | Cabe en el servidor |
| ------------------------------------ | --------------- | ------------------- |
| 16.3.0 · 16.3.1 · 16.3.2 · 16.3.8    | **2.30**        | **no**              |
| 16.2.12 · 16.1.7 · 16.0.11 · 15.5.27 | 2.17            | sí                  |

**Solo la línea 16.3 subió el requisito**, así que ningún parche dentro de 16.3
sirve. De ahí que `next` esté fijado en **16.2.12** y sin `^`: un caret dejaría
que pnpm resolviera 16.3 y el despliegue volvería a romperse con un síntoma que
no se parece a la causa.

Bajar a 16.2 no obliga a tocar código. `proxy.ts` se introdujo en **Next 16.0.0**,
así que `src/proxy.ts` sigue igual; bajar a 15 habría obligado a renombrarlo.

`scripts/check-swc-glibc.mjs` lo vigila desde CI. Mide el binario y no la
versión, para que siga valiendo cuando salga Next 17 sin mantener una lista.

> Turbopack **no** tiene respaldo en WebAssembly, que es la otra mitad de por qué
> esto no se podía parchear: sin binario nativo no hay build.

### Cómo se despliega

Un push a `main` construye en los dos sitios: Hostinger tiene el repo conectado
por Git, y Vercel también.

Ninguno de los dos **espera a que CI pase**. Si llega a molestar, en Vercel se
apaga el automático y se dispara desde Actions con un `VERCEL_TOKEN`.

El repo es **público**, y tuvo que serlo: el plan Hobby de Vercel no conecta
repositorios privados de una organización. Es también la razón por la que este
archivo no debe ganar secretos.

### Variables de entorno

Las mismas cinco en los dos entornos:

| Variable                   | Qué es                                          |
| -------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`     | la URL del entorno                              |
| `NEXT_PUBLIC_CHAT_ENABLED` | monta el widget del chat y la sección del aviso |
| `N8N_CONTACT_WEBHOOK_URL`  | el formulario de contacto                       |
| `N8N_CHAT_WEBHOOK_URL`     | el asistente                                    |
| `N8N_WEBHOOK_SECRET`       | compartido por los dos                          |

> ⚠️ `NEXT_OUTPUT_STANDALONE` **no debe existir en Hostinger.** Solo lo pone el
> `Dockerfile`. Con `standalone` encendido allí el sitio se construye pero se
> sirve sin estáticos. Ver el comentario del `output` en `next.config.ts`.

Las `NEXT_PUBLIC_*` se incrustan en el bundle durante el build: cambiarlas
obliga a **reconstruir**, no basta con guardarlas.

---

## Lo que hace falta

| Qué             | Dónde                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| VPS con Docker  | Hostinger KVM 1 basta (1 vCPU, 4 GB), plantilla **Ubuntu 24.04 con Docker** |
| Clave SSH       | `ssh-keygen -t ed25519`; la pública se sube al crear el VPS                 |
| Acceso al DNS   | **No está en Hostinger.** Ver abajo                                         |
| Secretos de n8n | `N8N_CONTACT_WEBHOOK_URL`, `N8N_CHAT_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`     |

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

## 2 · Despliegue continuo en un VPS (aparcado)

> Los dos archivos de esta sección —`.github/workflows/deploy.yml` y
> `scripts/deploy-remote.sh`— **no están en `main`**. Viven en la rama
> `parked/despliegue-vps`, porque un workflow que apunta a un servidor que no
> existe solo sirve para dejar `main` en rojo en cada push. Están escritos y
> probados; el día que haya VPS se recuperan con un `git cherry-pick`.

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

> ⚠️ **Esta sección está escrita para el VPS y hay que revisarla.** El destino es
> ahora el hosting gestionado, y queda algo por confirmar en hPanel: `xtt.com.mx`
> y el sitio Node están en **la misma cuenta** (`u313471813`), aunque no en la
> misma IP —el apex va a `191.101.79.61` y el sitio Node sale por el CDN de
> Hostinger (`147.79.72.235`)—. Si hPanel permite reasignar el dominio del
> WordPress al sitio Node, **el corte no necesitaría tocar el DNS de Google**,
> que es justo el acceso que hoy nadie tiene. Los pasos de abajo siguen siendo
> válidos como plan B, cambiando los registros del VPS por los que pida
> Hostinger.

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
