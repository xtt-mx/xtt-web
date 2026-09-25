# Desplegar

Este sitio es un proceso de Node, no PHP. **No corre en hosting compartido.**
El WordPress anterior sí —`xtt.com.mx` está hoy en hPanel de Hostinger con
LiteSpeed— y por eso no vale el mismo plan. Hace falta un VPS.

La infraestructura ya está escrita: `Dockerfile`, `docker-compose.yml` y
`Caddyfile`, con TLS automático de Let's Encrypt.

---

## Lo que hace falta

| Qué                 | Dónde                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| VPS con Docker      | Hostinger KVM 1 basta (1 vCPU, 4 GB), plantilla **Ubuntu 24.04 con Docker** |
| Clave SSH           | `ssh-keygen -t ed25519`; la pública se sube al crear el VPS                 |
| Deploy key del repo | El repo es privado; el VPS necesita leerlo                                  |
| Acceso al DNS       | **No está en Hostinger.** Ver abajo                                         |
| Secretos de n8n     | `N8N_CONTACT_WEBHOOK_URL`, `N8N_CHAT_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`     |

### El DNS no está donde está el hosting

```
$ dig +short NS xtt.com.mx
ns-cloud-d1.googledomains.com … d4
```

El dominio apunta a **nameservers de Google**, así que el DNS se administra
desde una cuenta de Google, no desde hPanel. Y en ese mismo DNS vive el correo
de la empresa:

```
$ dig +short MX xtt.com.mx
aspmx.l.google.com      (Google Workspace)
```

> **Al apuntar el dominio se cambia el registro `A` y nada más.**
> Tocar los `MX` o el `TXT` del SPF deja a XTT sin correo.

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

## 2 · Apuntar el dominio

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

## 3 · Comprobar

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
