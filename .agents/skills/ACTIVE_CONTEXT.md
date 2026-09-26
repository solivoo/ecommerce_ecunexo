# Ecommerce — Contexto Activo del Proyecto (Active Memory)

> Este archivo mantiene el hilo operativo de la SPA de vitrina pública para que cualquier sesión
> retome el trabajo con precisión. Se actualiza al completar o cambiar de hito.

---

## 1. Estado Actual del Repositorio

* **Repositorio:** `github.com/solivoo/ecommerce_ecunexo` (separado de `ecunexo` y `Ecunexo_cliente`).
* **Rama Activa:** `main` (sincronizada con `origin/main`).
* **Última Versión Publicada:** `v1.0.0` (tag anotado; `package.json` en `1.0.0`).
* **Verificación:** `pnpm test:run` 33/33, `pnpm build` limpio y contenedor Docker probado contra la
  API real (SPA `200` y `/api/.../storefront/products` con precio resuelto).

---

## 2. Arquitectura

SPA única para todas las tiendas; el tenant se resuelve en runtime por `Host`:

```text
Cliente → https://<dominio-del-cliente>
             │
             ▼
   nginx (mismo origen: SPA + /api)          Chrome/Cloudflare for SaaS (TLS por dominio)
             │
             ▼
   GET /api/v1/public/storefront/resolve?host=  → tenantId + branding
   GET /api/v1/public/tenants/{t}/storefront/products|categories
   GET /api/v1/public/tenants/{t}/storefront/products/{id}
```

* Los precios de la vitrina se resuelven con la **lista predeterminada de precios** del tenant
  (Catálogo → Gestión de precios) y el orden `price_asc/price_desc` usa el precio resuelto.
* La disponibilidad (`inStock`/`availableQuantity`) viene de inventario (`Quantity − ReservedQuantity`).
* No hay CORS: nginx proxya `/api` en el mismo origen y conserva el `Host`.

---

## 3. Hitos Recientes Completados

* **Vitrina multi-tenant con precios resueltos (`catalogApi`, `storefrontApi`, `storeSlice`,
  `CatalogPage`, `ProductDetailPage`) [v1.0.0]:** catálogo con filtros sincronizados a la URL
  (`buscar`, `categoria`, `orden`, `pagina`), ficha con galería, variantes y disponibilidad, y
  precios por lista con snapshot del motor de precios (`ecunexo_api`).
* **Despliegue Docker/nginx same-origin (`Dockerfile`, `nginx-spa.conf.template`,
  `docker-compose.yml`) [v1.0.0]:** un contenedor sirve todos los dominios; `API_UPSTREAM` define el
  API por entorno, `Host` se preserva y hay healthcheck. Overrides de build con prefijo
  `STOREFRONT_*` para no tomar el `.env` de desarrollo.
* **Guía de dominio `www.everchic.ec` (`doc/despliegue-www.everchic.ec.md`) [v1.0.0]:** pasos de
  DNS (CNAME + TXT), registro/verificación del dominio, despliegue, configuración del API,
  verificación y rollback.
* **UI de dominios en el admin de Cliente (`Ecommerce → Vitrina y dominios`) [sin bump en este
  repo]:** registrar dominio, verificar por DNS TXT, marcar principal y despublicar.

---

## 4. Configuración y Entorno

| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | Base del API. Vacío = mismo origen (nginx). |
| `VITE_API_PROXY_TARGET` | Proxy `/api` en desarrollo (ej. `http://localhost:5088`). |
| `VITE_TENANT_ID` | Override de desarrollo/mono-tenant. Vacío = resolución por Host. |
| `VITE_STORE_NAME` | Nombre de respaldo de la tienda. |
| `API_UPSTREAM` | (runtime nginx) API al que se proxya `/api`. |
| `STOREFRONT_PORT` | (compose) Puerto publicado; por defecto `8080`. |

Rutas: `/` (catálogo), `/producto/:productId` (ficha), `*` (no encontrado).

---

## 5. Despliegue

```bash
# Local (API en el host)
API_UPSTREAM=http://host.docker.internal:5088 docker compose up -d --build

# Producción
API_UPSTREAM=http://<api-interna>:8080 docker compose up -d --build
```

* Dominios de clientes: `Ecommerce → Vitrina y dominios` en `ecunexo_admin` (TXT `_ecunexo.<dominio>`
  + verificación) y, en producción, Custom Hostnames de Cloudflare con CNAME a `stores.ecunexo.com`.
* Guía detallada por dominio: `doc/despliegue-www.everchic.ec.md`.

---

## 6. Pendientes

* Carrito y checkout (pedidos ecommerce) contra `POST /ecommerce/orders` (ya resuelve precio
  server-side y guarda snapshot).
* Infraestructura Cloudflare for SaaS en producción (CNAME + TLS por dominio).
* Theming avanzado por tenant (tipografía, radios) sobre `--store-accent`.
* Pruebas E2E de la vitrina contra un stack real.
