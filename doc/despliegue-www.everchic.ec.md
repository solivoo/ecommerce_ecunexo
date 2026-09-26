# Despliegue del Ecommerce en `www.everchic.ec`

Guía operativa para publicar la vitrina de **Everchic** en su dominio propio, con precios,
disponibilidad y branding del tenant.

---

## 0. Arquitectura

```text
Cliente → https://www.everchic.ec
             │
             ▼
   Cloudflare for SaaS (Custom Hostname + TLS)
             │  CNAME
             ▼
   stores.ecunexo.com → contenedor storefront (nginx + SPA)
             │  /api/*  (mismo origen)
             ▼
   API EcuNexo (resolve por Host → tenant Everchic)
```

Una sola SPA sirve todos los dominios; el tenant se resuelve por el `Host`. No hay CORS porque
el API se proxya en el mismo origen.

---

## 1. Requisitos previos

1. **Tenant Everchic en producción** con el módulo `ecommerce` habilitado (entitlement de licencia).
2. **API EcuNexo productiva** accesible, con `Database__MigrateOnStartup=true`.
3. **Contenedor storefront** desplegado (ver §4).
4. **Datos del tenant**:
   - Productos físicos activos (los servicios no se publican).
   - Lista de precios predeterminada (`PUBLICO`) con precios vigentes (la migración
     `BackfillPricingFromBasePrice` copia `BasePrice`; los ítems sin precio quedan “Consultar”).
   - Branding: nombre de tienda, logo y color.
5. **Acceso al DNS de `everchic.ec`** (ideal: Cloudflare).
6. Permiso `ecommerce.storefront.manage` para el usuario administrador.

---

## 2. DNS del dominio

En la zona DNS de `everchic.ec`:

| Tipo | Nombre | Valor | Notas |
|---|---|---|---|
| CNAME | `www` | `stores.ecunexo.com` | Cloudflare for SaaS emite el TLS. No usar “DNS only” si Cloudflare gestiona el certificado. |
| TXT | `_ecunexo.www` | `ecunexo-site-verification=<TOKEN>` | El token lo entrega el registro del dominio (§3). |

Verificación rápida:

```bash
dig +short CNAME www.everchic.ec
dig +short TXT _ecunexo.www.everchic.ec
```

Si usan Cloudflare en su propia cuenta, el CNAME debe quedar **proxied** para que Cloudflare
termine el TLS del Custom Hostname.

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

## 4. Desplegar el storefront (plataforma)

En el servidor de la plataforma:

```bash
cd Monorepo/ecommerce

# Producción: apuntar al API productivo de EcuNexo
API_UPSTREAM="http://<HOST_API_ECUNEXO>:8080" \
STOREFRONT_PORT=8080 \
docker compose up -d --build
```

Verificar el contenedor:

```bash
docker compose ps
curl -sI http://localhost:8080 | head -1        # 200
curl -s  http://localhost:8080/api/v1/public/storefront/resolve?host=none | head -c 120
```

- `VITE_TENANT_ID` debe quedar vacío en producción (resolución por dominio).
- `Host` se conserva en el proxy: es lo que permite identificar a Everchic.
- Para servir `stores.ecunexo.com`, publicar el puerto del contenedor detrás del balanceador
  o crear el registro DNS/túnel de Cloudflare hacia ese host.

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
| 502 en `/api` | `API_UPSTREAM` incorrecto o API caída | Corregir variable y reiniciar el contenedor |
| TLS inválido | Custom Hostname pendiente o CNAME mal | Revisar Cloudflare for SaaS y propagación DNS |
| Cambios de dominio no se reflejan | Caché de `resolve` (60 s) | Esperar o eliminar/re-registrar el dominio |

---

## 9. Rollback

1. **Despublicar el dominio**: **Vitrina y dominios → Eliminar** (efecto inmediato).
2. **Revertir el storefront**: `docker compose down` y desplegar la imagen anterior.
3. **API**: las migraciones son aditivas; `BackfillPricingFromBasePrice` no se revierte
   automáticamente (los precios copiados pueden eliminarse manualmente si fuera necesario).
4. Las órdenes y snapshots ya generados no se recalculan nunca.
