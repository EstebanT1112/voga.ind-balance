# Arquitectura y Tecnologías — voga.ind balance

> **Nota para agentes de IA:** este documento define el stack tecnológico definitivo y la arquitectura técnica de la aplicación *voga.ind balance*. Complementa al documento funcional (`voga-ind-balance-contexto.md`). Cualquier decisión de desarrollo, modelado de datos o infraestructura debe ser consistente con lo definido acá.

---

## 1. Contexto y escala del proyecto

La aplicación está pensada para un uso **muy acotado: máximo 5 personas** (1 Dueña + hasta 4 Empleadas). Esto es un dato central para todas las decisiones de arquitectura: **no se necesita diseñar para escala**, sino para simplicidad, bajo costo y facilidad de mantenimiento por parte de un desarrollador o equipo chico.

Consecuencias directas de esta escala:

* Los planes gratuitos de los servicios elegidos sobran ampliamente en capacidad.
* No se justifica infraestructura compleja (múltiples entornos, balanceo de carga, colas, microservicios, etc.).
* La prioridad es minimizar la cantidad de servicios y piezas a mantener, no maximizar la capacidad de crecimiento.
* No es necesario publicar la app en las tiendas públicas (Google Play / App Store) en esta etapa.

---

## 2. Diagrama de arquitectura

```txt
┌─────────────────────────────┐
│   App mobile (React Native  │
│         + Expo)             │
└──────────────┬───────────────┘
               │  HTTPS / REST (JSON)
               ▼
┌─────────────────────────────┐
│   Backend: Hono              │
│   corriendo sobre             │
│   Supabase Edge Functions    │
└──────────────┬───────────────┘
               │
               ▼
┌─────────────────────────────┐
│   Supabase                   │
│   - PostgreSQL (datos)       │
│   - Supabase Auth (login)    │
│   - Supabase Storage (fotos) │
└─────────────────────────────┘
```

Todo el backend y la base de datos viven dentro de un único proveedor: **Supabase**. Esto reemplaza la propuesta inicial de usar Cloudflare Workers como servicio separado (ver sección 8, "Decisiones descartadas").

---

## 3. Stack tecnológico definitivo

### 3.1 Frontend (app mobile)

| Tecnología | Uso |
| ----------- | ----- |
| **React Native** | Framework para desarrollar la app multiplataforma (Android e iOS) desde una única base de código. |
| **Expo** | Toolchain sobre React Native que simplifica el desarrollo, las pruebas en dispositivos reales y la generación de builds (vía EAS Build). |

### 3.2 Backend

| Tecnología | Uso |
| ----------- | ----- |
| **Supabase Edge Functions** | Entorno serverless (basado en Deno) donde corre la API. Reemplaza a Cloudflare Workers. |
| **Hono** | Framework liviano para definir las rutas HTTP de la API, con sintaxis similar a Express. Corre sin problema sobre Deno / Edge Functions. |
| **TypeScript** | Lenguaje utilizado tanto en el backend como en el frontend, para tener tipado consistente en todo el proyecto. |

### 3.3 Base de datos, autenticación y almacenamiento

| Tecnología | Uso |
| ----------- | ----- |
| **Supabase (PostgreSQL)** | Base de datos relacional donde se guardan usuarios, productos, ventas, pagos, devoluciones y analíticas. |
| **Supabase Auth** | Gestión de login y sesiones de la Dueña y las Empleadas. |
| **Supabase Storage** | Almacenamiento de las fotos de los productos del catálogo. |

### 3.4 Comunicación

| Tecnología | Uso |
| ----------- | ----- |
| **API REST** | La app mobile se comunica con el backend mediante solicitudes HTTP. |
| **JSON** | Formato de intercambio de datos entre la app y la API. |
| **JWT (JSON Web Tokens)** | Emitidos por Supabase Auth al iniciar sesión; se envían en cada solicitud para identificar al usuario y su rol. |

---

## 4. Por qué este stack (justificación de cada elección)

### 4.1 React Native + Expo

Permite construir una sola app para Android e iOS, con un ciclo de desarrollo rápido y sin necesidad de configuración nativa compleja al inicio. Es el estándar de facto para apps chicas y medianas de este tipo.

### 4.2 Supabase Edge Functions + Hono (en vez de Cloudflare Workers)

La propuesta inicial planteaba un backend en Cloudflare Workers, separado de Supabase. Se descartó esa separación por lo siguiente:

* Usar dos proveedores cloud distintos (Cloudflare + Supabase) obliga a validar manualmente, dentro del Worker, los tokens JWT que emite Supabase Auth.
* Con Supabase Edge Functions, esa validación queda resuelta por la propia plataforma: un solo proveedor, una sola fuente de autenticación, menos piezas que puedan fallar.
* Hono se mantiene igual: es compatible con el runtime de Edge Functions (Deno), así que no se pierde la forma de organizar rutas tipo Express.
* Para 5 usuarios, ninguna de las dos opciones tiene problema de capacidad. La decisión es puramente de simplicidad operativa.

### 4.3 Supabase (PostgreSQL + Auth + Storage)

Al concentrar base de datos, autenticación y almacenamiento de archivos en un mismo proveedor, se reduce la cantidad de integraciones y credenciales a mantener. PostgreSQL además es un motor robusto y muy adecuado para las relaciones del negocio (productos, ventas, pagos, devoluciones, comisiones).

### 4.4 Centralización de reglas de negocio en el backend

Todas las reglas importantes (validar rol del usuario, calcular comisiones, recalcular saldos y estados de pago, marcar productos como vendidos, etc.) viven en el backend (Edge Functions + Hono), **no** en la app mobile. Esto es así independientemente de la escala del proyecto: la complejidad de las reglas de negocio (comisiones parciales, devoluciones que recalculan todo, vencimientos, analíticas) justifica tener una capa de API propia en vez de dejar la lógica dispersa entre políticas de base de datos y la app.

---

## 5. Roles y autenticación

Existen dos roles técnicos, mapeados así:

| Rol visible | Rol técnico |
| ------------ | ------------ |
| Dueña       | `owner`      |
| Empleada    | `seller`     |

El backend debe validar en **cada solicitud** que el usuario autenticado tenga el rol correspondiente antes de ejecutar una acción. Por ejemplo:

* Solo `owner` puede crear/desactivar empleadas, aplicar aumentos masivos, anular ventas o ver precios de compra.
* `seller` solo puede operar sobre sus propias ventas.

Una empleada desactivada no debe poder autenticarse ni ejecutar ninguna acción, aunque su token JWT anterior todavía no haya expirado (el backend debe verificar el estado activo/inactivo en cada solicitud, no solo confiar en el token).

---

## 6. Regla técnica crítica: concurrencia sobre productos únicos

Los productos se manejan como **unidades únicas** (no como stock agrupado). Esto implica un riesgo real, aunque la app tenga pocos usuarios: dos empleadas podrían intentar vender el mismo producto físico casi al mismo tiempo.

El backend debe garantizar que solo una de esas ventas se confirme, mediante una operación atómica a nivel de base de datos. Ejemplo conceptual:

```sql
UPDATE productos
SET estado = 'vendido'
WHERE id = :producto_id
  AND estado = 'disponible';
```

Si la operación afecta 0 filas, significa que el producto ya fue vendido por otra persona en ese mismo instante, y la API debe responder con un error claro ("producto ya no disponible") en vez de crear la venta.

Esta regla es independiente de la tecnología elegida, pero debe quedar implementada explícitamente en la API — no alcanza con que la app mobile verifique el estado antes de vender, porque entre la verificación y la confirmación puede pasar una venta simultánea.

---

## 7. Distribución de la app

Dado que la app es para un máximo de 5 personas conocidas, **no es necesario publicarla en Google Play ni en la App Store** en esta etapa. Se recomienda distribución interna mediante **EAS Build**:

* **Android:** se genera un archivo `.apk` instalable directamente, compartido por una URL. No requiere cuenta de Google Play Developer.
* **iOS:** requiere igualmente una cuenta de Apple Developer Program (membresía anual de USD 99) para firmar builds de distribución ad hoc, pero se evita el proceso de revisión de Apple. Las actualizaciones se pueden enviar de forma casi instantánea mediante EAS Update.

Si en el futuro se decide publicar la app públicamente (por ejemplo, si el emprendimiento crece y contrata más empleadas o quiere una instalación más simple), se puede dar ese paso más adelante sin rehacer el desarrollo.

> Queda pendiente confirmar si las 5 personas usan Android, iPhone o ambos, ya que si todas usan Android se evita directamente el costo de la cuenta de Apple Developer.

---

## 8. Planes, costos y decisiones descartadas

### 8.1 Plan de Supabase

El plan gratuito de Supabase incluye 500 MB de base de datos, 1 GB de almacenamiento de archivos y hasta 50.000 usuarios activos mensuales — muy por encima de lo que necesitan 5 usuarios. Sin embargo, tiene dos limitaciones importantes a tener en cuenta:

* **Pausa por inactividad:** un proyecto gratuito se pausa automáticamente si no recibe actividad de base de datos durante 7 días seguidos, y debe reactivarse manualmente.
* **Sin backups automáticos.**

**Recomendación:** dado que la app maneja datos financieros reales del negocio (ventas, cobros, comisiones), se recomienda pasar al plan **Supabase Pro** (~USD 25/mes) apenas la app esté en uso real, principalmente por los backups diarios y para eliminar el riesgo de pausa. Si se prefiere empezar 100% gratis, como mínimo hay que configurar un ping automático periódico (por ejemplo, con GitHub Actions) para evitar la pausa por inactividad — aunque esto no resuelve la falta de backups.

### 8.2 Plan de Expo / EAS

Los planes gratuitos de EAS Build son suficientes para generar builds de distribución interna en esta etapa. Si el proyecto crece o se necesitan builds más frecuentes, existen planes pagos de Expo, pero no son necesarios para el uso inicial.

### 8.3 Decisiones descartadas

| Propuesta original | Motivo del cambio |
| -------------------- | -------------------- |
| Backend en Cloudflare Workers, separado de Supabase | Agregaba un segundo proveedor cloud y la necesidad de validar manualmente los JWT de Supabase Auth dentro del Worker. Se reemplaza por Supabase Edge Functions, manteniendo Hono como framework de rutas. |
| Publicación inmediata en Google Play / App Store | Innecesaria para 5 usuarios conocidos. Se reemplaza por distribución interna vía EAS Build. |

---

## 9. Flujo de ejemplo (venta de una empleada)

```txt
1. La empleada inicia sesión → Supabase Auth valida credenciales y devuelve un JWT.
2. La app solicita el catálogo de productos disponibles a la API (Hono sobre Edge Functions).
3. La empleada arma el carrito y confirma una venta.
4. La API valida el JWT y el rol (seller).
5. La API ejecuta una actualización atómica: marca los productos como "vendido"
   solo si seguían "disponible" (ver sección 6).
6. La API crea el registro de venta en PostgreSQL (Supabase).
7. La API calcula el estado de pago inicial (pagado / parcial / fiado).
8. La Dueña puede ver la venta reflejada en su Home y en la sección Ventas.
```

---

## 10. Resumen del stack final

```txt
Frontend:
- React Native
- Expo
- Distribución interna vía EAS Build (sin tiendas públicas por ahora)

Backend:
- Supabase Edge Functions (Deno)
- Hono (framework de rutas)
- TypeScript

Datos, autenticación y archivos:
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage

Comunicación:
- API REST + JSON
- JWT para autenticación

Plan recomendado:
- Supabase Pro (~USD 25/mes) apenas haya ventas reales, por backups
  y para evitar pausas por inactividad
```

Esta arquitectura prioriza simplicidad (un solo proveedor cloud principal), bajo costo, y cubre los puntos críticos de negocio: control de roles, prevención de doble venta sobre productos únicos, y distribución rápida a un grupo cerrado de usuarios.
