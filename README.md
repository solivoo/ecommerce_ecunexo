# Ecommerce · Vitrina EcuNexo

SPA pública de catálogo. Consume los endpoints `storefront` de `ecunexo_api`
(catálogo, categorías, precios y disponibilidad calculada desde inventario).

Guía de despliegue por dominio: [`doc/despliegue-www.everchic.ec.md`](doc/despliegue-www.everchic.ec.md).

## Stack

React 19 · TypeScript 6 · Vite 8 · Redux Toolkit · React Router 7 · axios · CSS Modules.
Tipografía auto-hospedada (Archivo); sin dependencias de UI externas.

## Requisitos

- Node 24+
- pnpm 11+
- API `ecunexo_api` en `http://localhost:5088`

## Configuración

```bash
cp .env.example .env.local
```

| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | Base de la API. Vacío = mismo origen / proxy de Vite. |
| `VITE_API_PROXY_TARGET` | Destino del proxy `/api` en desarrollo. |
| `VITE_TENANT_ID` | Override de desarrollo/mono-tenant. Vacío = resolución por Host. |
| `VITE_STORE_NAME` | Nombre de respaldo de la tienda (override de desarrollo). |

## Scripts

```bash
pnpm dev            # servidor de desarrollo
pnpm build          # typecheck + build de producción
pnpm preview        # sirve el build
pnpm lint           # ESLint
pnpm test           # Vitest en modo watch
pnpm test:run       # Vitest una vez
pnpm test:coverage  # cobertura
```

## Rutas

| Ruta | Vista |
|---|---|
| `/` | Catálogo con filtros sincronizados a la URL (`?buscar=&categoria=&tipo=&orden=&pagina=`) |
| `/producto/:productId` | Ficha con galería y selector de variantes |
| `*` | No encontrado |

## Multi-tenant por dominio

Una sola SPA para todas las tiendas; el tenant se resuelve en runtime por `Host`:

1. `GET /api/v1/public/storefront/resolve?host=...` (anónimo, cacheado 60 s) devuelve
   `tenantId`, nombre, logo, color y locale. Solo responde dominios **verificados** de
   empresas activas con el módulo `ecommerce`.
2. `VITE_TENANT_ID` es solo override de desarrollo o despliegue mono-tenant.

### Publicar un dominio

1. Registrar: `POST /api/v1/tenants/{tenantId}/ecommerce/storefront/domains`
   (permiso `ecommerce.storefront.manage`, máximo 10 dominios).
2. Crear un registro TXT `_ecunexo.<dominio>` con el valor devuelto
   (`ecunexo-site-verification=<token>`).
3. `POST .../domains/{id}/verify` valida el DNS; hasta entonces la tienda no es pública.
4. `PUT .../domains/{id}/primary` define el dominio canónico (debe estar verificado).
5. `DELETE .../domains/{id}` despublica el dominio al instante (purga de caché).

### Infraestructura (Cloudflare for SaaS)

- **Subdominios de plataforma:** DNS wildcard `*.tienda.ecunexo.com` hacia el contenedor
  de la SPA y certificado wildcard `*.tienda.ecunexo.com`.
- **Dominios personalizados:** Cloudflare for SaaS (Custom Hostnames); el cliente apunta
  un `CNAME` a `stores.ecunexo.com` y Cloudflare emite/renueva el TLS por dominio.
- **Mismo origen:** cada dominio sirve la SPA y proxya `/api` al backend. Así no se
  configura CORS por dominio ni se exponen tokens entre orígenes.
- **Caché:** `resolve` responde `Cache-Control: public,max-age=60`; verificar o eliminar
  un dominio purga su entrada.

### Despliegue (Docker + nginx)

```bash
# Local: API de EcuNexo en el host (puerto 5088)
API_UPSTREAM=http://host.docker.internal:5088 docker compose up -d --build

# Producción: API interno del entorno
API_UPSTREAM=http://api:8080 docker compose up -d --build
```

También se puede construir sin compose:

```bash
docker build -t ecunexo-storefront:1.0.0 .

docker run -d -p 8080:80 \
  -e API_UPSTREAM="http://api:8080" \
  --name storefront ecunexo-storefront:1.0.0
```

- `VITE_API_BASE_URL` vacío en build = mismo origen; nginx proxya `/api/` a `API_UPSTREAM`.
- `VITE_TENANT_ID` vacío en producción para resolución por dominio.
- Overrides opcionales de build con prefijo `STOREFRONT_*` para no tomar el `.env` de desarrollo.
- `Host` se conserva en el proxy: cada dominio entra a la misma SPA y `resolve` decide la tienda.
- `STOREFRONT_PORT` cambia el puerto publicado (8080 por defecto).
- Un solo contenedor sirve todos los dominios (wildcard o Custom Hostnames de Cloudflare).

## API consumida

```
GET /api/v1/public/storefront/resolve?host=mitienda.com
GET /api/v1/public/tenants/{tenantId}/storefront/products?search=&categoryId=&kind=&sort=&page=&pageSize=
GET /api/v1/public/tenants/{tenantId}/storefront/products/{productId}
GET /api/v1/public/tenants/{tenantId}/storefront/categories
```

Son anónimos; la API valida el tenant, el entitlement `ecommerce` y solo expone
**productos físicos activos** (los servicios no se publican en la vitrina) con campos
públicos (sin costo, sin atributos internos).

## Estructura

```
src/
├─ api/        client.ts (axios + interceptores), catalogApi, errors, types
├─ app/        store, router, GlobalStatus
├─ store/      slices catalog/product/ui + thunks
├─ features/catalog/  componentes de vitrina (grid, filtros, galería, variantes)
├─ layout/     StoreHeader, StoreFooter, StoreLayout
├─ pages/      catalog, product, not-found, errors
├─ lib/        formato, helpers, configuración de tienda
└─ styles/     tokens.css + global.css
```

Los filtros viven en la URL; el estado remoto en Redux. Las peticiones del listado
se cancelan al cambiar de filtros o desmontar, y las respuestas obsoletas se descartan.

## Pruebas

Vitest + Testing Library: interceptores axios, normalización de errores, slices
(carga, error y descarte de respuestas obsoletas), vitrina y ficha con selección de variantes.

## Pendiente

- Carrito y checkout (pedidos ecommerce).
- Infraestructura Cloudflare for SaaS en producción (CNAME + TLS por dominio).
- Theming avanzado por tenant (tipografía, radios) sobre `--store-accent`.
