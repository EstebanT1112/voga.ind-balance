# Esquema de Supabase — voga.ind balance

> Este documento define el modelo inicial de datos para Supabase/PostgreSQL. Debe usarse como base para crear las migraciones SQL del proyecto.

---

## 1. Criterios generales

- Base de datos: PostgreSQL en Supabase.
- Autenticación: Supabase Auth.
- Archivos: Supabase Storage para fotos de productos.
- Moneda: pesos argentinos sin centavos.
- Montos: `integer`, por ejemplo `$20.000` se guarda como `20000`.
- Roles técnicos: `owner` y `seller`.
- Los productos son unidades únicas, no stock agrupado.
- Las reglas críticas se validan en backend, pero la base debe proteger consistencia con constraints, índices y transacciones.

---

## 2. Enums

### 2.1 `user_role`

```sql
create type user_role as enum ('owner', 'seller');
```

### 2.2 `product_status`

```sql
create type product_status as enum ('available', 'sold');
```

### 2.3 `product_category`

```sql
create type product_category as enum ('upper', 'lower', 'lingerie');
```

### 2.4 `payment_status`

```sql
create type payment_status as enum ('paid', 'partial', 'unpaid', 'overdue');
```

### 2.5 `sale_admin_status`

```sql
create type sale_admin_status as enum ('active', 'voided');
```

### 2.6 `return_status`

```sql
create type return_status as enum ('return_window', 'confirmed', 'with_return');
```

### 2.7 `payment_kind`

```sql
create type payment_kind as enum ('initial', 'later');
```

### 2.8 `sale_item_status`

```sql
create type sale_item_status as enum ('sold', 'returned', 'voided');
```

---

## 3. Tablas principales

## 3.1 `profiles`

Extiende los usuarios de Supabase Auth con datos propios del negocio.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_full_name_not_empty check (length(trim(full_name)) > 0),
  constraint profiles_color_format check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);
```

Reglas:

- La Dueña se crea manualmente desde Supabase y luego se registra su perfil `owner`.
- Las empleadas se crean desde la app por la Dueña usando email y contraseña temporal.
- Una empleada inactiva no puede operar aunque tenga un token vigente.
- `color` se usa principalmente para empleadas, pero se permite `null` para la Dueña.

Índices:

```sql
create index profiles_role_idx on profiles(role);
create index profiles_active_idx on profiles(active);
```

---

## 3.2 `products`

Representa cada prenda o producto físico como una unidad única.

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_path text,
  size text not null,
  description text,
  category product_category not null,
  subcategory text,
  purchase_price integer not null,
  sale_price integer not null,
  status product_status not null default 'available',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_name_not_empty check (length(trim(name)) > 0),
  constraint products_size_not_empty check (length(trim(size)) > 0),
  constraint products_purchase_price_non_negative check (purchase_price >= 0),
  constraint products_sale_price_non_negative check (sale_price >= 0),
  constraint products_sale_price_not_below_purchase check (sale_price >= purchase_price)
);
```

Reglas:

- Solo `owner` puede crear o editar productos.
- `seller` puede ver productos, pero no puede ver `purchase_price`.
- Los productos vendidos siguen apareciendo en catálogo.
- Un producto `sold` no puede volver a venderse.
- Si se anula una venta o se devuelve un producto, vuelve a `available`.

Índices:

```sql
create index products_status_idx on products(status);
create index products_category_idx on products(category);
create index products_size_idx on products(size);
create index products_created_at_idx on products(created_at desc);
```

---

## 3.3 `sales`

Representa una venta completa. Puede incluir uno o varios productos.

```sql
create table sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id),
  buyer_full_name text not null,
  buyer_phone text not null,
  sale_date timestamptz not null default now(),
  due_date date not null,
  return_deadline date not null,
  total_amount integer not null default 0,
  total_purchase_cost integer not null default 0,
  paid_amount integer not null default 0,
  pending_amount integer not null default 0,
  payment_status payment_status not null default 'unpaid',
  return_status return_status not null default 'return_window',
  admin_status sale_admin_status not null default 'active',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sales_buyer_full_name_not_empty check (length(trim(buyer_full_name)) > 0),
  constraint sales_buyer_phone_not_empty check (length(trim(buyer_phone)) > 0),
  constraint sales_total_amount_non_negative check (total_amount >= 0),
  constraint sales_total_purchase_cost_non_negative check (total_purchase_cost >= 0),
  constraint sales_paid_amount_non_negative check (paid_amount >= 0),
  constraint sales_pending_amount_non_negative check (pending_amount >= 0),
  constraint sales_paid_amount_not_over_total check (paid_amount <= total_amount),
  constraint sales_pending_matches_total check (pending_amount = total_amount - paid_amount)
);
```

Reglas:

- `seller_id` es quien realizó la venta: puede ser Dueña u Empleada.
- Ventas de la Dueña no generan comisión.
- Ventas de Empleadas generan comisión sobre pagos efectivamente cobrados.
- `due_date` debe ser 30 días después de `sale_date`.
- `return_deadline` debe ser 7 días después de `sale_date`.
- Una venta anulada conserva el registro, pero no impacta balances, comisiones ni analíticas.
- `payment_status` se recalcula cuando se crea una venta, se agrega un pago, se devuelve un producto o se anula.

Índices:

```sql
create index sales_seller_id_idx on sales(seller_id);
create index sales_sale_date_idx on sales(sale_date desc);
create index sales_due_date_idx on sales(due_date);
create index sales_payment_status_idx on sales(payment_status);
create index sales_return_status_idx on sales(return_status);
create index sales_admin_status_idx on sales(admin_status);
```

---

## 3.4 `sale_items`

Relaciona ventas con productos. Guarda snapshot de precios para no depender de cambios futuros en el catálogo.

```sql
create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  product_size text not null,
  product_category product_category not null,
  product_subcategory text,
  purchase_price integer not null,
  sale_price integer not null,
  status sale_item_status not null default 'sold',
  returned_at timestamptz,
  created_at timestamptz not null default now(),

  constraint sale_items_purchase_price_non_negative check (purchase_price >= 0),
  constraint sale_items_sale_price_non_negative check (sale_price >= 0),
  constraint sale_items_returned_at_required check (
    (status = 'returned' and returned_at is not null)
    or (status <> 'returned' and returned_at is null)
  )
);
```

Reglas:

- Cada producto puede estar asociado a una sola venta activa como item vendido.
- Si la venta se anula, los items pasan a `voided`.
- Si se devuelve un producto, el item pasa a `returned`.
- Para analíticas solo cuentan items `sold` de ventas `active` y `confirmed`.

Índice único crítico:

```sql
create unique index sale_items_one_active_sale_per_product_idx
on sale_items(product_id)
where status = 'sold';
```

Índices:

```sql
create index sale_items_sale_id_idx on sale_items(sale_id);
create index sale_items_product_id_idx on sale_items(product_id);
create index sale_items_category_idx on sale_items(product_category);
create index sale_items_status_idx on sale_items(status);
```

---

## 3.5 `payments`

Registra cada ingreso de dinero asociado a una venta.

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  registered_by uuid not null references profiles(id),
  amount integer not null,
  kind payment_kind not null,
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),

  constraint payments_amount_positive check (amount > 0)
);
```

Reglas:

- Los pagos son positivos.
- Si hay que reflejar devolución de dinero, se recomienda usar una tabla de devoluciones con `refund_amount` y recalcular totales, no insertar pagos negativos.
- La comisión se calcula por pago cobrado, en el mes de `paid_at`.
- Una empleada solo puede registrar pagos en sus propias ventas.
- La Dueña puede registrar pagos en cualquier venta.

Índices:

```sql
create index payments_sale_id_idx on payments(sale_id);
create index payments_paid_at_idx on payments(paid_at desc);
create index payments_registered_by_idx on payments(registered_by);
```

---

## 3.6 `returns`

Representa una operación de devolución parcial o total.

```sql
create table returns (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  registered_by uuid not null references profiles(id),
  refund_amount integer not null default 0,
  reason text,
  returned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint returns_refund_amount_non_negative check (refund_amount >= 0)
);
```

Reglas:

- Solo se permite dentro de los 7 días desde la venta.
- La Dueña puede devolver productos de cualquier venta.
- La Empleada solo puede devolver productos de sus propias ventas.
- `refund_amount` representa dinero devuelto al comprador, si corresponde.
- La devolución debe recalcular total de venta, monto cobrado, saldo pendiente, comisión y ganancia.

Índices:

```sql
create index returns_sale_id_idx on returns(sale_id);
create index returns_registered_by_idx on returns(registered_by);
create index returns_returned_at_idx on returns(returned_at desc);
```

---

## 3.7 `return_items`

Detalle de productos devueltos en una devolución.

```sql
create table return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns(id) on delete cascade,
  sale_item_id uuid not null references sale_items(id),
  product_id uuid not null references products(id),
  sale_price integer not null,
  purchase_price integer not null,
  created_at timestamptz not null default now(),

  constraint return_items_sale_price_non_negative check (sale_price >= 0),
  constraint return_items_purchase_price_non_negative check (purchase_price >= 0)
);
```

Reglas:

- Un `sale_item` no puede devolverse dos veces.
- Al registrar el item devuelto, el producto vuelve a `available`.
- La venta recalcula sus totales excluyendo items devueltos.

Índice único:

```sql
create unique index return_items_sale_item_id_unique_idx on return_items(sale_item_id);
```

Índices:

```sql
create index return_items_return_id_idx on return_items(return_id);
create index return_items_product_id_idx on return_items(product_id);
```

---

## 3.8 `price_adjustments`

Registra aumentos masivos aplicados por la Dueña.

```sql
create table price_adjustments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id),
  percentage numeric(6, 2) not null,
  note text,
  created_at timestamptz not null default now(),

  constraint price_adjustments_percentage_positive check (percentage > 0)
);
```

### 3.9 `price_adjustment_items`

Guarda el detalle producto por producto de un aumento masivo.

```sql
create table price_adjustment_items (
  id uuid primary key default gen_random_uuid(),
  price_adjustment_id uuid not null references price_adjustments(id) on delete cascade,
  product_id uuid not null references products(id),
  old_sale_price integer not null,
  new_sale_price integer not null,
  created_at timestamptz not null default now(),

  constraint price_adjustment_items_old_price_non_negative check (old_sale_price >= 0),
  constraint price_adjustment_items_new_price_non_negative check (new_sale_price >= 0),
  constraint price_adjustment_items_new_price_greater check (new_sale_price > old_sale_price)
);
```

Reglas:

- Solo `owner` puede aplicar aumentos.
- Debe existir vista previa en backend/app antes de confirmar.
- Se recomienda aplicar aumentos solo a productos `available`.
- El historial permite auditar qué productos cambiaron y cuánto.

Índices:

```sql
create index price_adjustment_items_adjustment_id_idx on price_adjustment_items(price_adjustment_id);
create index price_adjustment_items_product_id_idx on price_adjustment_items(product_id);
```

---

## 4. Funciones SQL recomendadas

## 4.1 `set_updated_at`

Función genérica para mantener `updated_at`.

```sql
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Triggers:

```sql
create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

create trigger sales_set_updated_at
before update on sales
for each row execute function set_updated_at();
```

---

## 4.2 Venta atómica de productos

La creación de ventas debe hacerse dentro de una operación transaccional en backend o mediante una función SQL RPC.

La regla crítica es:

```sql
update products
set status = 'sold'
where id = any(product_ids)
  and status = 'available';
```

Después del `update`, la cantidad de filas afectadas debe coincidir con la cantidad de productos solicitados.

Si no coincide:

- No se crea la venta.
- No se crean `sale_items`.
- No se registran pagos.
- La API responde error claro: producto no disponible.

Esto evita que dos empleadas vendan el mismo producto al mismo tiempo.

---

## 4.3 Recalcular estado de pago

El backend debe recalcular:

```txt
pending_amount = total_amount - paid_amount
```

Estado:

```txt
paid    -> pending_amount = 0
partial -> paid_amount > 0 y pending_amount > 0
unpaid  -> paid_amount = 0 y pending_amount > 0
overdue -> pending_amount > 0 y due_date < fecha actual
```

`overdue` puede calcularse dinámicamente en consultas o persistirse mediante actualización programada/manual desde la API. Para la primera versión se recomienda calcularlo desde consultas del backend para evitar jobs.

---

## 5. Vistas recomendadas

## 5.1 `confirmed_sale_items_view`

Base para analíticas.

Debe incluir solo:

- Ventas `active`.
- Ventas con `return_status = 'confirmed'`.
- Items `sold`.

No debe incluir:

- Ventas anuladas.
- Ventas dentro del plazo de devolución.
- Productos devueltos.
- Items anulados.

## 5.2 `monthly_payments_view`

Base para total cobrado y comisiones mensuales.

Debe agrupar pagos por:

- Mes de `paid_at`.
- `seller_id`.
- Rol del vendedor.

Las comisiones solo aplican si el vendedor tiene rol `seller`.

---

## 6. Cálculos de negocio

## 6.1 Comisión

```txt
commission_amount = round(payment_amount * 0.15)
```

Recomendación técnica:

- No guardar comisiones como tabla al inicio.
- Calcularlas desde `payments` + `sales` + `profiles`.
- Redondear al peso argentino más cercano porque el sistema no maneja centavos.
- Si luego se necesita marcar comisiones como pagadas a empleadas, agregar una tabla `commission_settlements`.

## 6.2 Ganancia cobrada proporcional

```txt
collected_ratio = paid_amount / total_amount
proportional_purchase_cost = total_purchase_cost * collected_ratio
collected_profit = paid_amount - proportional_purchase_cost
```

Debe excluir ventas anuladas.

Para ventas con devolución, usar los totales recalculados.

## 6.3 Total esperado del mes

```txt
total_expected = new_sales_amount_for_month + pending_amount_from_previous_months
```

Debe incluir:

- Ventas nuevas del mes.
- Saldos pendientes anteriores.

No debe incluir:

- Ventas anuladas.
- Items devueltos.

---

## 7. Storage

Bucket sugerido:

```txt
product-photos
```

Path sugerido:

```txt
products/{product_id}/{filename}
```

Reglas:

- La Dueña puede subir fotos.
- Las empleadas pueden leer fotos.
- La app mobile guarda en `products.photo_path` el path del archivo, no necesariamente una URL pública permanente.
- El backend o la app pueden convertir el path en URL firmada cuando haga falta.

---

## 8. RLS y permisos

Aunque las reglas principales vivan en la API, se recomienda activar RLS para evitar accesos accidentales directos desde clientes.

Estrategia inicial:

- La app mobile opera datos sensibles mediante la API.
- La API usa service role key en Edge Functions.
- Las tablas de negocio no deberían permitir escritura directa desde el cliente mobile.
- Storage puede permitir lectura autenticada de fotos y escritura controlada para `owner`.

Políticas detalladas se definirán al crear migraciones.

---

## 9. Relaciones principales

```txt
auth.users
  └─ profiles

profiles
  ├─ products.created_by
  ├─ sales.seller_id
  ├─ sales.created_by
  ├─ payments.registered_by
  ├─ returns.registered_by
  └─ price_adjustments.created_by

sales
  ├─ sale_items
  ├─ payments
  └─ returns

products
  ├─ sale_items
  ├─ return_items
  └─ price_adjustment_items

returns
  └─ return_items
```

---

## 10. Tablas que no se agregan en primera versión

### 10.1 `customers`

No se crea tabla de compradores al inicio. La venta guarda `buyer_full_name` y `buyer_phone`.

Motivo:

- El historial avanzado de compradores no es prioridad.
- Simplifica carga de ventas.

Puede agregarse después si se necesita consultar deuda o historial por comprador.

### 10.2 `commission_settlements`

No se crea tabla de liquidación de comisiones al inicio.

Motivo:

- La comisión se puede calcular desde pagos.
- Primero importa saber cuánto corresponde pagar, no necesariamente registrar cuándo se pagó esa comisión.

Puede agregarse después si la Dueña necesita marcar comisiones como pagadas.

### 10.3 `notifications`

No se crea tabla de notificaciones al inicio.

Motivo:

- Los recordatorios se pueden mostrar en Home mediante consultas.
- Las notificaciones automáticas no son prioridad para la primera versión.
