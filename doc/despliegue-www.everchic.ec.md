# Despliegue del Ecommerce en `www.everchic.ec`

Guía operativa para publicar la vitrina de **Everchic** en su dominio propio, con precios,
disponibilidad y branding del tenant.

---

## 0. Arquitectura (despliegue self-hosted)

```text
Cliente → https://www.everchic.ec
             │
             ▼
   Cloudflare DNS (A www → IP pública VPS front, DNS only)
             │
             ▼
   NPM en el VPS front (TLS Let's Encrypt, 443)
             │  red Docker compartida
             ▼
   contenedor storefront (nginx + SPA, puerto interno 80)
             │  /api/*  (mismo origen)
             ▼
   Tailscale (WireGuard P2P)
             │
             ▼
   API EcuNexo en el VPS API (:5088) → resolve por Host → tenant Everchic
```

- Una sola SPA sirve todos los dominios; el tenant se resuelve por el `Host` (la SPA
  envía `?host=` explícito en `resolve`, así que funciona a través de cualquier proxy).
- **VPS front**: storefront + Nginx Proxy Manager (`172.245.185.86`).
- **VPS API**: stack `ecunexo-cliente`, API publicada en `:5088` (`100.83.245.45` por Tailscale).
- El tramo storefront→API viaja cifrado por Tailscale y **nunca** se expone a internet.
- No hay CORS: el navegador solo habla con el VPS front.

---

## 1. Requisitos previos

1. **Tenant Everchic en producción** con el módulo `ecommerce` habilitado (entitlement de licencia).
2. **API EcuNexo productiva** accesible, con `Database__MigrateOnStartup=true`.
3. **VPS front** con Docker, Nginx Proxy Manager y Tailscale; **VPS API** con Tailscale
   (ver §4.1).
4. **Datos del tenant**:
   - Productos físicos activos (los servicios no se publican).
   - Lista de precios predeterminada (`PUBLICO`) con precios vigentes (la migración
     `BackfillPricingFromBasePrice` copia `BasePrice`; los ítems sin precio quedan “Consultar”).
   - Branding: nombre de tienda, logo y color.
5. **Acceso al DNS de `everchic.ec`** (Cloudflare).
6. Permiso `ecommerce.storefront.manage` para el usuario administrador.

---

## 2. DNS del dominio

En la zona DNS de `everchic.ec` (Cloudflare):

| Tipo | Nombre | Valor | Notas |
|---|---|---|---|
| A | `www` | `<IP_PUBLICA_VPS_FRONT>` | **DNS only (nube gris)** mientras NPM emite el Let's Encrypt |
| TXT | `_ecunexo.www` | `ecunexo-site-verification=<TOKEN>` | El token lo entrega el registro del dominio (§3). |

Reglas:

- Elimina cualquier CNAME previo de `www` (p. ej. `stores.ecunexo.com`).
- Con **nube naranja** el reto HTTP-01 de Let's Encrypt falla: primero emite el certificado en
  NPM con la nube gris y, si luego quieres proxy de Cloudflare, usa **Origin Certificate** en
  NPM y SSL/TLS en **Full (strict)**.

Verificación rápida:

```bash
dig +short www.everchic.ec                  # debe devolver la IP del VPS front
dig +short TXT _ecunexo.www.everchic.ec
```

---

## 3. Registrar y verificar el dominio (UI del admin)

1. Entrar a **Ecommerce → Vitrina y dominios** (`/ecommerce/vitrina`).
2. Botón **«+ Agregar dominio»** → escribir `www.everchic.ec` → **Registrar dominio**.
3. Copiar el **registro TXT** que muestra el diálogo y crearlo en el DNS (§2).
4. Esperar la propagación (segundos a minutos) y pulsar **Verificar** en la fila.
5. Cuando quede **Verificado**, pulsar **Marcar como principal** (dominio canónico).

Alternativa por API (mismo flujo):

```bash
TENANT="<TENANT_ID_EVERCHIC>"
API="https://api.ecunexo.com"
TOKEN="<JWT_ADMIN>"

curl -s -X POST "$API/api/v1/tenants/$TENANT/ecommerce/storefront/domains" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"domain":"www.everchic.ec"}'

curl -s -X POST "$API/api/v1/tenants/$TENANT/ecommerce/storefront/domains/<DOMAIN_ID>/verify" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X PUT "$API/api/v1/tenants/$TENANT/ecommerce/storefront/domains/<DOMAIN_ID>/primary" \
  -H "Authorization: Bearer $TOKEN"
```

> El `resolve` está cacheado 60 s; verificar o eliminar un dominio purga la caché al instante.

---

## 4. Desplegar el storefront (self-hosted)

### 4.1 Tailscale (VPS front ↔ VPS API)

En el VPS API (ya instalado):

```bash
tailscale ip -4                        # anota la IP, ej. 100.83.245.45
ss -lntp | grep 5088                   # la API debe escuchar en 0.0.0.0:5088
```

En el VPS front:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
# Auth key: admin de Tailscale → Settings → Keys
sudo tailscale up --auth-key=tskey-auth-XXXX --hostname=everchic-front
tailscale status                       # el VPS API debe aparecer "direct" (no "relay")
curl -s "http://100.83.245.45:5088/api/v1/public/storefront/resolve?host=www.everchic.ec" | jq
```

Seguridad: bloquea el puerto `5088` en el firewall/security group del VPS API y déjalo
accesible solo por la interfaz `tailscale0`. Nunca público.

### 4.2 Levantar el contenedor

Con **Portainer** (stack desde Git): repo `ecommerce_ecunexo`, compose `docker-compose.yml`,
variables de entorno del stack:

```
API_UPSTREAM=http://100.83.245.45:5088
STOREFRONT_PORT=8089
```

Con **docker compose** en el VPS:

```bash
cd ecommerce_ecunexo
cat > .env <<'EOF'
API_UPSTREAM=http://100.83.245.45:5088
STOREFRONT_PORT=8089
EOF
docker compose up -d --build
```

Notas:

- `STOREFRONT_PORT=8089` porque el `8080` del VPS front está ocupado por otro servicio.
- `API_UPSTREAM` usa la IP de Tailscale (estable), **no** MagicDNS: el nginx del contenedor
  no resuelve DNS del tailnet.
- No definas `VITE_*`, `STOREFRONT_API_BASE_URL`, `STOREFRONT_TENANT_ID` ni
  `STOREFRONT_STORE_NAME` en producción (resolución por dominio).

Verificar el contenedor:

```bash
docker port ecommerce_everchic-storefront-1        # 8089->80
curl -s "http://localhost:8089/api/v1/public/storefront/resolve?host=www.everchic.ec" | jq
```

### 4.3 Nginx Proxy Manager

El `docker-compose.yml` declara la red de NPM como externa (`npm_network` →
`nginx-proxy-manager_default`), así que el contenedor **se une solo en cada redeploy**; ya no
hace falta `docker network connect`.

Si el stack no se despliega con este compose (o la red no existe), créala/conéctala a mano:

```bash
docker network connect nginx-proxy-manager_default ecommerce_everchic-storefront-1
```

> Alternativa sin red compartida: Forward Hostname = IP gateway de NPM (`172.20.0.1`),
> Forward Port = `8089`.
> Para desarrollo local, crea la red una vez con `docker network create nginx-proxy-manager_default`.

Proxy Host (UI en `http://<IP_VPS_FRONT>:81`):

| Campo | Valor |
|---|---|
| Domain Names | `www.everchic.ec` |
| Scheme | `http` |
| Forward Hostname/IP | `ecommerce_everchic-storefront-1` |
| Forward Port | `80` |
| Block Common Exploits | activado |
| SSL | Request new Let's Encrypt + Force SSL + HTTP/2 |

---

## 5. Configuración de la API productiva

Variables de entorno relevantes (stack `ecunexo-cliente`):

```env
Database__MigrateOnStartup=true
ConnectionStrings__Default=Host=postgres;Port=5432;Database=<DB>;Username=<USER>;Password=<PASS>

# Tarifas IVA reales desde Facturación (si no se define, respaldo 15%)
BillingTaxRates__BaseUrl=https://<HOST_FACTURACION>
BillingTaxRates__TaxCode=2
BillingTaxRates__DefaultRateCode=4
BillingTaxRates__FallbackRate=0.15

# Solo admin (el storefront es same-origin y no requiere CORS)
Cors__AllowedOrigins=https://admin.ecunexo.com

# Puerto publicado de la API (restringir a Tailscale en el firewall)
CLIENTE_API_HOST_PORT=5088
```

Reiniciar la API tras desplegar: aplica las migraciones pendientes
(`AddPricingModule`, `AddEcommerceOrderItemPricingSnapshot`, `AddProductPriceOverlapConstraint`,
`BackfillPricingFromBasePrice`) y el seeder agrega el menú **Vitrina y dominios** y los permisos
`catalog.pricing.*` / `ecommerce.storefront.manage` a los roles de sistema.

---

## 6. Preparar el catálogo de Everchic

1. **Verificar la lista de precios**: `Ecommerce` no publica precios sin lista. En
   **Catálogo → Gestión de precios → Listas**, confirmar que existe `PUBLICO` como predeterminada.
2. **Cargar precios faltantes**: en **Precios de productos**, revisar que cada producto tenga
   precio vigente. Los que quedaron sin `BasePrice` en el catálogo deben cargarse a mano (o quedan
   “Consultar” y los pedidos ecommerce se bloquean con `ecommerce.order.price_not_configured`).
3. **Branding**: **Organización → Perfil y branding** → nombre, logo y color de Everchic.
4. **Fotos y categorías**: los productos deben tener imágenes y categorías para verse bien en la
   vitrina.
5. Opcional: **Promociones** y **escalas** con vigencia; el simulador permite previsualizar.

---

## 7. Verificación final

```bash
# 1) El dominio resuelve al tenant correcto
curl -s "https://www.everchic.ec/api/v1/public/storefront/resolve" | jq

# 2) Catálogo con precios resueltos
curl -s "https://www.everchic.ec/api/v1/public/tenants/<TENANT_ID_EVERCHIC>/storefront/products?pageSize=3" | jq '.items[] | {name, price, inStock}'

# 3) Ficha de producto (variantes, imágenes, disponibilidad)
curl -s "https://www.everchic.ec/api/v1/public/tenants/<TENANT_ID_EVERCHIC>/storefront/products/<PRODUCT_ID>" | jq '{name, price, variants: (.variants | length)}'
```

En el navegador:

1. Abrir `https://www.everchic.ec` → catálogo con branding de Everchic.
2. Probar búsqueda, filtros, orden por precio, paginación.
3. Abrir una ficha con variantes → selector, galería y precio por variante.
4. Confirmar candado TLS válido para `www.everchic.ec`.

---

## 8. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `resolve` responde 404 | Dominio sin verificar, tenant sin módulo `ecommerce` o suspendido | Verificar TXT y módulo; reintentar verificación |
| Catálogo vacío | Productos sin stock/público o tenant sin catálogo activo | Revisar ítems activos y filtros |
| Precio “Consultar” | Sin precio vigente en la lista predeterminada | Cargar precio o corregir vigencia |
| Pedido rechazado `ecommerce.order.price_not_configured` | Producto sin lista/precio | Cargar precio antes de vender |
| **502 Bad Gateway (openresty)** | NPM no alcanza el upstream (red/puerto) | Verificar Forward Port `80` y que el stack use el compose con `npm_network`; alternativa `172.20.0.1:8089` |
| **TLS `unrecognized name`** | Proxy Host inexistente o sin certificado para el dominio | Crear/editar el Proxy Host y emitir Let's Encrypt |
| 502 en `/api` | `API_UPSTREAM` incorrecto o Tailscale caído | `tailscale status` y probar `curl http://100.83.245.45:5088/api/v1/public/storefront/resolve?host=www.everchic.ec` |
| TLS inválido | DNS con nube naranja o cert pendiente | Nube gris mientras se emite el cert; después Origin Certificate + Full (strict) |
| Cambios de dominio no se reflejan | Caché de `resolve` (60 s) | Esperar o eliminar/re-registrar el dominio |

---

## 9. Rollback

1. **Despublicar el dominio**: **Vitrina y dominios → Eliminar** (efecto inmediato).
2. **Revertir el storefront**: `docker compose down` y desplegar la imagen anterior.
3. **API**: las migraciones son aditivas; `BackfillPricingFromBasePrice` no se revierte
   automáticamente (los precios copiados pueden eliminarse manualmente si fuera necesario).
4. Las órdenes y snapshots ya generados no se recalculan nunca.

---

## 10. Datos del entorno actual

| Dato | Valor |
|---|---|
| VPS front (storefront + NPM) | `172.245.185.86` (RackNerd) |
| VPS API (Tailscale) | `100.83.245.45` |
| Puerto público del storefront en el VPS | `8089` (interno `80`) |
| Stack / contenedor | `ecommerce_everchic` / `ecommerce_everchic-storefront-1` |
| Red compartida con NPM | `nginx-proxy-manager_default` (gateway `172.20.0.1`), declarada como externa en el compose |
| UI de NPM | `http://172.245.185.86:81` |
| Tenant Everchic (producción) | `01a082f0-b204-7aae-b7d5-ede5dd9a477a` |
