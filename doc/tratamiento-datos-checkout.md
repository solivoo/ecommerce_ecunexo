# Tratamiento de datos personales en el checkout

Guía operativa del consentimiento de datos personales de la vitrina y de lo que la SPA
guarda en el navegador. Aplica a todos los dominios de tienda (por ejemplo
`www.everchic.ec`).

---

## 1. Qué se captura

En el checkout público el comprador debe marcar el checkbox **«Acepto la política de
tratamiento de datos personales»** (enlace a `/privacidad`, se abre en una pestaña nueva)
antes de poder confirmar el pedido.

- El payload de `POST /api/v1/public/tenants/{tenantId}/storefront/orders` incluye
  `acceptPrivacyPolicy: true`.
- El backend valida el flag en `CreateStorefrontOrderValidator`: si llega `false` o
  ausente responde `ecommerce.checkout.privacy_required` («Debes aceptar la política de
  tratamiento de datos personales.») y no crea el pedido.
- Al crear la orden, `EcommerceOrder.Create(...)` registra la fecha/hora UTC del
  consentimiento en `ecommerce.orders.data_consent_at_utc`
  (`DateTimeOffset?`, migración `AddEcommerceOrderDataConsent`).
- Los pedidos creados desde el admin (venta asistida) **no** capturan consentimiento:
  `data_consent_at_utc` queda `NULL` en ese caso.

---

## 2. Dónde se prueba

En el admin: **Ecommerce → Pedidos → detalle del pedido** → tarjeta
«Reserva de Stock & Pago» → fila **«Consentimiento de datos»**, que muestra la fecha y
hora del consentimiento o «No registrado» para pedidos administrativos.

Por API, `GET /api/v1/tenants/{tenantId}/ecommerce/orders/{orderId}` devuelve
`dataConsentAtUtc` en el detalle (`EcommerceOrderDetailDto`).

El texto legal público vive en `src/pages/legal/PrivacyPage.tsx` (ruta `/privacidad`),
enlazado desde el footer de la tienda y desde el checkbox del checkout.

---

## 3. Almacenamiento local en el navegador

La vitrina **no usa cookies de publicidad ni de rastreo**. Solo escribe en
`localStorage`:

| Clave | Contenido | Para qué |
|---|---|---|
| `ecunexo.cart.v1` | Ítems del carrito | No perder la compra al recargar |
| `ecunexo.likes.v1` | IDs de productos gustados | Mostrar el estado del «me gusta» |
| `ecunexo.visitor.v1` | Identificador anónimo del visitante | Evitar duplicar un mismo like |

El visitante puede borrar estos datos desde la configuración de su navegador (limpiar
datos de sitios, cookies y almacenamiento local); al hacerlo se reinician carrito,
gustados y visitante. Esta información no se envía a terceros ni identifica a la persona.

---

## 4. Notas legales y siguientes pasos

- El texto de `PrivacyPage.tsx` es una base funcional: **debe ser revisado por un
  abogado** antes de considerarlo definitivo, especialmente en lo relativo a plazos de
  conservación, transferencias y canales de ejercicio de derechos (LOPDP, Ecuador).
- A futuro el texto puede **parametrizarse por tienda** (por ejemplo, un setting de
  política de tratamiento por tenant) sin tocar el flujo de consentimiento.
- El consentimiento se guarda como timestamp en el pedido; no se almacena el texto
  exacto aceptado. Si se requiere evidencia de la versión, se puede añadir un campo de
  versión de política junto al timestamp.
