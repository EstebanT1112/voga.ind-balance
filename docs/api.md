# voga.ind balance - API REST

Este documento resume los endpoints disponibles del backend `Node.js + Express + TypeScript`.

Base local:

```txt
http://localhost:3000
```

En Render, la base URL será la URL pública del Web Service.

## Autenticación

La app mobile inicia sesión contra Supabase Auth. Luego debe enviar el JWT de Supabase en cada request protegida:

```http
Authorization: Bearer SUPABASE_ACCESS_TOKEN
Content-Type: application/json
```

Todos los endpoints, excepto `GET /health`, requieren autenticación.

Roles:

```txt
owner  = dueña
seller = vendedora
```

Los montos se envían y reciben como enteros en pesos argentinos, sin centavos.

Formato de error:

```json
{
  "error": {
    "code": "bad_request",
    "message": "Invalid request data"
  }
}
```

Errores posibles:

```txt
bad_request
unauthorized
forbidden
not_found
internal_error
```

## Health

### GET `/health`

Permisos: público.

Respuesta:

```json
{
  "ok": true,
  "service": "voga.ind balance api"
}
```

## Auth

### GET `/auth/me`

Permisos: `owner`, `seller`.

Devuelve el usuario autenticado y su perfil interno.

Respuesta:

```json
{
  "user": {
    "id": "uuid",
    "email": "duena@example.com"
  },
  "profile": {
    "id": "uuid",
    "role": "owner",
    "fullName": "Nombre Dueña",
    "color": null,
    "active": true,
    "createdAt": "2026-07-09T00:00:00.000Z",
    "updatedAt": "2026-07-09T00:00:00.000Z"
  }
}
```

## Products

Categorías:

```txt
upper
lower
lingerie
```

Estados:

```txt
available
sold
```

### GET `/products`

Permisos: `owner`, `seller`.

Query params:

```txt
status=available|sold
category=upper|lower|lingerie
search=texto
```

Regla de visibilidad:

- `owner` ve `purchasePrice` y `createdBy`.
- `seller` no ve `purchasePrice` ni `createdBy`.

Respuesta:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Top negro",
      "photoPath": "products/top-negro.webp",
      "size": "M",
      "description": null,
      "category": "upper",
      "subcategory": "top",
      "salePrice": 12000,
      "status": "available",
      "createdAt": "2026-07-09T00:00:00.000Z",
      "updatedAt": "2026-07-09T00:00:00.000Z",
      "purchasePrice": 7000,
      "createdBy": "uuid"
    }
  ],
  "next": null
}
```

### GET `/products/:id`

Permisos: `owner`, `seller`.

Respuesta:

```json
{
  "item": {
    "id": "uuid",
    "name": "Top negro",
    "photoPath": "products/top-negro.webp",
    "size": "M",
    "description": null,
    "category": "upper",
    "subcategory": "top",
    "salePrice": 12000,
    "status": "available",
    "createdAt": "2026-07-09T00:00:00.000Z",
    "updatedAt": "2026-07-09T00:00:00.000Z"
  }
}
```

### POST `/products`

Permisos: `owner`.

Body:

```json
{
  "name": "Top negro",
  "photoPath": "products/top-negro.webp",
  "size": "M",
  "description": null,
  "category": "upper",
  "subcategory": "top",
  "purchasePrice": 7000,
  "salePrice": 12000
}
```

Validaciones principales:

- `salePrice >= purchasePrice`
- `purchasePrice` y `salePrice` enteros positivos o cero
- `name`, `size` y `category` obligatorios

### PATCH `/products/:id`

Permisos: `owner`.

Body parcial:

```json
{
  "salePrice": 13000,
  "description": "Nuevo precio"
}
```

Regla:

- Si el producto está `sold`, no se pueden editar datos comerciales como precio, categoría o subcategoría.

## Sales

Estados de pago:

```txt
paid
partial
unpaid
overdue
```

Estados de devolución:

```txt
return_window
confirmed
with_return
```

Estados administrativos:

```txt
active
voided
```

### GET `/sales`

Permisos: `owner`, `seller`.

Query params:

```txt
sellerId=uuid
paymentStatus=paid|partial|unpaid|overdue
returnStatus=return_window|confirmed|with_return
adminStatus=active|voided
from=2026-07-01T00:00:00.000Z
to=2026-07-31T23:59:59.999Z
```

Reglas:

- `owner` puede ver todas las ventas.
- `seller` solo ve sus propias ventas.
- `owner` ve `totalPurchaseCost` y `items[].purchasePrice`.
- `seller` no ve costos internos.

Respuesta:

```json
{
  "items": [
    {
      "id": "uuid",
      "sellerId": "uuid",
      "buyerFullName": "Cliente",
      "buyerPhone": "1122334455",
      "saleDate": "2026-07-09T00:00:00.000Z",
      "dueDate": "2026-07-16",
      "returnDeadline": "2026-07-12",
      "totalAmount": 12000,
      "totalPurchaseCost": 7000,
      "paidAmount": 5000,
      "pendingAmount": 7000,
      "paymentStatus": "partial",
      "returnStatus": "return_window",
      "adminStatus": "active",
      "createdBy": "uuid",
      "createdAt": "2026-07-09T00:00:00.000Z",
      "updatedAt": "2026-07-09T00:00:00.000Z",
      "items": [
        {
          "id": "uuid",
          "saleId": "uuid",
          "productId": "uuid",
          "productName": "Top negro",
          "productSize": "M",
          "productCategory": "upper",
          "productSubcategory": "top",
          "purchasePrice": 7000,
          "salePrice": 12000,
          "status": "sold",
          "returnedAt": null,
          "createdAt": "2026-07-09T00:00:00.000Z"
        }
      ]
    }
  ],
  "next": null
}
```

### GET `/sales/:id`

Permisos: `owner`, `seller`.

Regla:

- `seller` solo puede ver la venta si le pertenece.

### POST `/sales`

Permisos: `owner`, `seller`.

Body:

```json
{
  "sellerId": "uuid",
  "buyerFullName": "Cliente",
  "buyerPhone": "1122334455",
  "productIds": ["uuid"],
  "initialPaymentAmount": 5000,
  "saleDate": "2026-07-09T00:00:00.000Z"
}
```

Notas:

- `sellerId` es opcional para `owner`; si no se envía, la venta queda a nombre de la dueña.
- `seller` puede omitir `sellerId`; si lo envía, debe ser su propio id.
- La creación usa una operación atómica en Supabase.

Validaciones principales:

- `productIds` debe tener al menos un producto.
- Los productos deben estar disponibles.
- `initialPaymentAmount` no puede superar el total de la venta.

## Payments

Tipos:

```txt
initial
later
```

### GET `/payments`

Permisos: `owner`, `seller`.

Query params:

```txt
saleId=uuid
registeredBy=uuid
kind=initial|later
from=2026-07-01T00:00:00.000Z
to=2026-07-31T23:59:59.999Z
```

Reglas:

- `owner` ve todos los pagos.
- `seller` solo ve pagos de sus propias ventas.

Respuesta:

```json
{
  "items": [
    {
      "id": "uuid",
      "saleId": "uuid",
      "registeredBy": "uuid",
      "amount": 5000,
      "kind": "later",
      "paidAt": "2026-07-09T00:00:00.000Z",
      "note": null,
      "createdAt": "2026-07-09T00:00:00.000Z"
    }
  ],
  "next": null
}
```

### GET `/payments/:id`

Permisos: `owner`, `seller`.

Regla:

- `seller` solo puede ver el pago si pertenece a una venta propia.

### POST `/payments`

Permisos: `owner`, `seller`.

Body:

```json
{
  "saleId": "uuid",
  "amount": 7000,
  "paidAt": "2026-07-09T00:00:00.000Z",
  "note": "Transferencia"
}
```

Validaciones principales:

- `amount` debe ser entero positivo.
- No puede superar el pendiente de la venta.
- No se puede registrar pago sobre una venta anulada.
- `seller` solo puede registrar pagos de sus propias ventas.

## Returns

### GET `/returns`

Permisos: `owner`, `seller`.

Query params:

```txt
saleId=uuid
registeredBy=uuid
from=2026-07-01T00:00:00.000Z
to=2026-07-31T23:59:59.999Z
```

Reglas:

- `owner` ve todas las devoluciones.
- `seller` solo ve devoluciones de sus propias ventas.
- `owner` ve `items[].purchasePrice`.
- `seller` no ve costos internos.

Respuesta:

```json
{
  "items": [
    {
      "id": "uuid",
      "saleId": "uuid",
      "registeredBy": "uuid",
      "refundAmount": 5000,
      "reason": "Cambio de talle",
      "returnedAt": "2026-07-09T00:00:00.000Z",
      "createdAt": "2026-07-09T00:00:00.000Z",
      "items": [
        {
          "id": "uuid",
          "returnId": "uuid",
          "saleItemId": "uuid",
          "productId": "uuid",
          "salePrice": 12000,
          "purchasePrice": 7000,
          "createdAt": "2026-07-09T00:00:00.000Z"
        }
      ]
    }
  ],
  "next": null
}
```

### GET `/returns/:id`

Permisos: `owner`, `seller`.

Regla:

- `seller` solo puede ver la devolución si pertenece a una venta propia.

### POST `/returns`

Permisos: `owner`, `seller`.

Body:

```json
{
  "saleId": "uuid",
  "saleItemIds": ["uuid"],
  "refundAmount": 5000,
  "reason": "Cambio de talle",
  "returnedAt": "2026-07-09T00:00:00.000Z"
}
```

Validaciones principales:

- `saleItemIds` debe tener al menos un item.
- La venta debe estar activa.
- La devolución debe estar dentro del plazo.
- Los items deben pertenecer a la venta.
- No se pueden devolver items ya devueltos.
- `refundAmount` no puede superar lo cobrado.
- `seller` solo puede devolver items de sus propias ventas.

## Expenses

### GET `/expenses`

Permisos: `owner`.

Query params:

```txt
category=viaticos
from=2026-07-01T00:00:00.000Z
to=2026-07-31T23:59:59.999Z
```

Respuesta:

```json
{
  "items": [
    {
      "id": "uuid",
      "createdBy": "uuid",
      "category": "viaticos",
      "description": "Remis",
      "amount": 3000,
      "spentAt": "2026-07-09T00:00:00.000Z",
      "note": null,
      "createdAt": "2026-07-09T00:00:00.000Z",
      "updatedAt": "2026-07-09T00:00:00.000Z"
    }
  ],
  "next": null
}
```

### GET `/expenses/:id`

Permisos: `owner`.

### POST `/expenses`

Permisos: `owner`.

Body:

```json
{
  "category": "viaticos",
  "description": "Remis",
  "amount": 3000,
  "spentAt": "2026-07-09T00:00:00.000Z",
  "note": null
}
```

### PATCH `/expenses/:id`

Permisos: `owner`.

Body parcial:

```json
{
  "amount": 3500,
  "note": "Actualizado"
}
```

### DELETE `/expenses/:id`

Permisos: `owner`.

Respuesta:

```txt
204 No Content
```

## Reports

### GET `/reports`

Permisos: `owner`.

Query params:

```txt
from=2026-07-01T00:00:00.000Z
to=2026-07-31T23:59:59.999Z
```

Respuesta:

```json
{
  "totals": {
    "salesAmount": 12000,
    "collectedAmount": 12000,
    "refundedAmount": 0,
    "netCollectedAmount": 12000,
    "pendingAmount": 0,
    "collectedProfit": 5000,
    "expensesAmount": 3000,
    "commissionAmount": 1800,
    "netProfitAfterExpenses": 200
  },
  "topCategories": [
    {
      "key": "upper",
      "quantity": 1,
      "amount": 12000
    }
  ],
  "topSizes": [
    {
      "key": "M",
      "quantity": 1,
      "amount": 12000
    }
  ],
  "expensesByCategory": [
    {
      "category": "viaticos",
      "amount": 3000
    }
  ],
  "commissionsBySeller": [
    {
      "sellerId": "uuid",
      "collectedAmount": 12000,
      "commissionAmount": 1800
    }
  ]
}
```

Notas:

- `topCategories` y `topSizes` usan items confirmados, es decir ventas activas fuera de ventana de devolución y sin items devueltos.
- `collectedProfit` usa ganancia cobrada proporcional.
- `commissionAmount` calcula 15% sobre cobros netos de vendedoras.
- `netProfitAfterExpenses = collectedProfit - expensesAmount - commissionAmount`.

## Orden sugerido de prueba manual

1. `GET /health`
2. Login en Supabase Auth desde mobile o cliente de prueba.
3. `GET /auth/me`
4. `POST /products`
5. `GET /products`
6. `POST /sales`
7. `POST /payments`
8. `POST /returns`
9. `POST /expenses`
10. `GET /reports`
