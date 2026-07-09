# Arquitectura y Tecnologías — voga.ind balance

> **Nota para agentes de IA:** este documento define el stack tecnológico definitivo y la arquitectura técnica de la aplicación *voga.ind balance*. Complementa al documento funcional (`voga-ind-balance-contexto.md`). Cualquier decisión de desarrollo, modelado de datos o infraestructura debe ser consistente con lo definido acá.

---

## 1. Contexto y escala del proyecto

La aplicación está pensada para un uso **muy acotado: máximo 5 personas** (1 Dueña + hasta 4 Empleadas). No se diseña para escala grande, pero sí para disponibilidad práctica: la API debe estar activa cuando la app mobile la necesite.

Consecuencias directas:

- No se justifican microservicios, colas ni infraestructura compleja.
- La prioridad es una API clara, modular y fácil de mantener.
- La base de datos sigue centralizada en Supabase PostgreSQL.
- El backend se despliega como servicio web tradicional en Render.
- No se usa el plan Free de Render porque puede dormir el servicio.

---

## 2. Diagrama de arquitectura

```txt
┌─────────────────────────────┐
│   App mobile                │
│   React Native + Expo       │
└──────────────┬──────────────┘
               │ HTTPS / REST (JSON)
               ▼
┌─────────────────────────────┐
│   API REST                  │
│   Node.js + Express         │
│   TypeScript                │
│   Render Web Service Starter│
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│   Supabase                  │
│   - PostgreSQL (datos)      │
│   - Supabase Auth (login)   │
│   - Supabase Storage (fotos)│
└─────────────────────────────┘
```

---

## 3. Stack tecnológico definitivo

### 3.1 Frontend mobile

| Tecnología | Uso |
| ----------- | --- |
| **React Native** | App mobile multiplataforma desde una única base de código. |
| **Expo** | Toolchain para desarrollo, pruebas y builds Android mediante EAS. |

### 3.2 Backend

| Tecnología | Uso |
| ----------- | --- |
| **Node.js** | Runtime del backend. |
| **Express** | Framework HTTP para la API REST. |
| **TypeScript** | Tipado del backend, compartido con mobile cuando aplique. |
| **Render Web Service Starter** | Hosting del backend sin dormir la API. |

### 3.3 Datos, autenticación y archivos

| Tecnología | Uso |
| ----------- | --- |
| **Supabase PostgreSQL** | Base relacional de productos, ventas, pagos, devoluciones, empleadas y analíticas. |
| **Supabase Auth** | Login y emisión de JWT. |
| **Supabase Storage** | Fotos de productos. |

### 3.4 Comunicación

| Tecnología | Uso |
| ----------- | --- |
| **API REST** | La app mobile consume endpoints HTTP del backend. |
| **JSON** | Formato de intercambio. |
| **JWT** | Token emitido por Supabase Auth y validado por el backend. |

---

## 4. Organización del backend

El backend se organiza por módulos y por capas:

```txt
Controller -> Service -> Repository
```

Responsabilidades:

- **Controller:** recibe la request, valida datos básicos y devuelve la response.
- **Service:** contiene la lógica de negocio y reglas principales.
- **Repository:** se comunica con Supabase/PostgreSQL.

Estructura base:

```txt
apps/api/src/
├─ config/
├─ lib/
├─ middlewares/
├─ modules/
│  ├─ auth/
│  ├─ users/
│  ├─ products/
│  ├─ sales/
│  ├─ payments/
│  ├─ returns/
│  ├─ expenses/
│  └─ reports/
├─ types/
├─ app.ts
└─ server.ts
```

Cada módulo puede tener, cuando corresponda:

```txt
routes
controller
service
repository
types
validations
```

---

## 5. Render

El backend se despliega en **Render** como **Web Service Starter**.

Motivo:

- Evita que el backend se duerma.
- Mantiene la API disponible para la app mobile.
- Es más simple de operar que un setup serverless para esta app.

El servidor debe escuchar el puerto definido por Render:

```ts
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});
```

Comandos esperados en Render:

```txt
Build Command: pnpm install --frozen-lockfile && pnpm api:build
Start Command: pnpm api:start
```

---

## 6. Variables de entorno

Variables del backend:

```txt
NODE_ENV=production
PORT=3000
CORS_ORIGIN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Variables de la app mobile:

```txt
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

Reglas:

- `SUPABASE_SERVICE_ROLE_KEY` solo vive en el backend y en Render.
- Nunca debe exponerse como `EXPO_PUBLIC_*`.
- `EXPO_PUBLIC_API_URL` apunta a la URL pública del Web Service de Render.

---

## 7. Roles y autenticación

Roles técnicos:

| Rol visible | Rol técnico |
| ----------- | ----------- |
| Dueña | `owner` |
| Empleada | `seller` |

El backend debe validar en cada request:

- JWT válido de Supabase Auth.
- Perfil existente en `profiles`.
- Usuario activo.
- Rol autorizado para la acción.

Una empleada desactivada no debe operar aunque conserve un JWT vigente.

---

## 8. Regla técnica crítica: concurrencia sobre productos únicos

Los productos son unidades únicas. Dos personas podrían intentar vender el mismo producto al mismo tiempo.

El backend debe resolverlo con una operación atómica contra PostgreSQL. La migración inicial ya incluye la RPC:

```txt
create_sale_atomic
```

La API debe usar esa operación para crear ventas, en vez de hacer pasos sueltos desde el controller.

Si algún producto ya no está disponible:

- No se crea la venta.
- No se registra pago.
- No se crean items.
- La API responde un error claro.

---

## 9. Distribución de la app

Primera versión: **Android**.

Distribución recomendada:

- Build interno con EAS.
- APK instalable por URL.
- Sin publicación inicial en Google Play.

---

## 10. Planes y costos

### 10.1 Render

Usar **Render Web Service Starter**, no Free.

Motivo:

- El plan Free puede dormir la API.
- La app necesita disponibilidad inmediata para registrar ventas, pagos y devoluciones.

### 10.2 Supabase

Supabase puede iniciar en plan gratuito para desarrollo. Para uso real se recomienda pasar a Pro por:

- Backups diarios.
- Menor riesgo operativo.
- Datos financieros reales.

### 10.3 Expo / EAS

El plan gratuito alcanza para builds internos iniciales.

---

## 11. Decisiones descartadas

| Propuesta | Motivo |
| --------- | ------ |
| Cloudflare Workers | Agregaba otro proveedor y validación manual de JWT. |
| Supabase Edge Functions + Hono | Se reemplaza por backend tradicional más simple de desplegar y mantener en Render. |
| Render Free | Puede dormir la API. |
| Publicación inmediata en tiendas | Innecesaria para un grupo cerrado de usuarias. |

---

## 12. Resumen del stack final

```txt
Mobile:
- React Native
- Expo

Backend:
- Node.js
- Express
- TypeScript
- Render Web Service Starter

Database/Auth/Storage:
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage

Arquitectura backend:
- Controller
- Service
- Repository
```

Esta arquitectura prioriza claridad, disponibilidad y mantenimiento simple.
