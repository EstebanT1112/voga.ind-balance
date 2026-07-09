# Estructura del monorepo — voga.ind balance

> Este documento define la estructura inicial del repositorio para desarrollar la app mobile, el backend en Supabase Edge Functions y el código compartido del proyecto.

---

## 1. Objetivo

El monorepo debe mantener juntas las piezas principales de la aplicación:

- App mobile con React Native + Expo.
- Backend con Hono sobre Supabase Edge Functions.
- Migraciones y configuración de Supabase.
- Tipos, constantes y utilidades compartidas.
- Documentación funcional y técnica.

La prioridad es simplicidad. La app está pensada para un máximo de 5 personas, por lo que no conviene introducir una estructura pesada ni herramientas innecesarias.

---

## 2. Estructura propuesta

```txt
voga.ind-balance/
├─ apps/
│  └─ mobile/
│     ├─ app/
│     ├─ src/
│     │  ├─ api/
│     │  ├─ auth/
│     │  ├─ components/
│     │  ├─ constants/
│     │  ├─ features/
│     │  │  ├─ analytics/
│     │  │  ├─ catalog/
│     │  │  ├─ employees/
│     │  │  ├─ home/
│     │  │  ├─ profile/
│     │  │  └─ sales/
│     │  ├─ hooks/
│     │  ├─ navigation/
│     │  ├─ storage/
│     │  ├─ theme/
│     │  ├─ types/
│     │  └─ utils/
│     ├─ assets/
│     ├─ app.json
│     ├─ eas.json
│     ├─ package.json
│     └─ tsconfig.json
│
├─ packages/
│  └─ shared/
│     ├─ src/
│     │  ├─ constants/
│     │  ├─ schemas/
│     │  ├─ types/
│     │  └─ utils/
│     ├─ package.json
│     └─ tsconfig.json
│
├─ supabase/
│  ├─ functions/
│  │  └─ api/
│  │     ├─ routes/
│  │     │  ├─ analytics.ts
│  │     │  ├─ auth.ts
│  │     │  ├─ catalog.ts
│  │     │  ├─ employees.ts
│  │     │  ├─ home.ts
│  │     │  └─ sales.ts
│  │     ├─ services/
│  │     │  ├─ analytics.service.ts
│  │     │  ├─ catalog.service.ts
│  │     │  ├─ employees.service.ts
│  │     │  ├─ payments.service.ts
│  │     │  ├─ returns.service.ts
│  │     │  └─ sales.service.ts
│  │     ├─ lib/
│  │     │  ├─ auth.ts
│  │     │  ├─ errors.ts
│  │     │  ├─ money.ts
│  │     │  ├─ supabase.ts
│  │     │  └─ validators.ts
│  │     └─ index.ts
│  ├─ migrations/
│  ├─ seed/
│  └─ config.toml
│
├─ docs/
│  ├─ voga-ind-balance-arquitectura.md
│  ├─ voga-ind-balance-contexto.md
│  └─ voga-ind-balance-monorepo.md
│
├─ .env.example
├─ .gitignore
├─ package.json
├─ pnpm-workspace.yaml
├─ README.md
└─ tsconfig.base.json
```

---

## 3. Decisiones principales

### 3.1 `apps/mobile`

Contiene únicamente la aplicación mobile hecha con Expo.

Se separa por funcionalidades dentro de `src/features`:

- `home`: resumen mensual de Dueña y Empleada.
- `catalog`: productos, fotos, estados y aumentos.
- `sales`: ventas, pagos posteriores, devoluciones y anulaciones.
- `analytics`: métricas para la Dueña.
- `employees`: alta, listado, colores y desactivación de empleadas.
- `profile`: datos personales y cierre de sesión.

La carpeta `app/` queda reservada para Expo Router si se usa navegación basada en archivos. Si se decide usar React Navigation sin Expo Router, la navegación principal quedará en `src/navigation`.

### 3.2 `supabase/functions/api`

Contiene una única Edge Function llamada `api`, montada con Hono.

Se elige una sola función porque:

- La app es chica.
- Simplifica el deploy.
- Simplifica autenticación, middlewares y manejo de errores.
- Evita repartir reglas de negocio en varias funciones.

Las rutas HTTP viven en `routes/`, pero la lógica real queda en `services/`.

### 3.3 `supabase/migrations`

Contiene las migraciones SQL de PostgreSQL:

- Tablas.
- Índices.
- Constraints.
- Funciones SQL críticas.
- Políticas RLS si se usan.

La operación atómica para vender productos únicos debe quedar resuelta desde el backend apoyándose en SQL transaccional.

### 3.4 `packages/shared`

Contiene código TypeScript compartido entre mobile y backend.

Uso previsto:

- Tipos de dominio.
- Constantes de roles, estados y categorías.
- Schemas de validación compartidos cuando aplique.
- Utilidades puras, por ejemplo formato de dinero o cálculo de porcentajes.

No debe contener código que dependa de React Native, Expo, Deno o Supabase directamente.

### 3.5 `docs`

Mantiene las decisiones funcionales y técnicas del proyecto.

Los documentos actuales siguen siendo fuente de verdad:

- `voga-ind-balance-contexto.md`
- `voga-ind-balance-arquitectura.md`
- `voga-ind-balance-monorepo.md`

---

## 4. Package manager

Se recomienda usar `pnpm` workspaces.

Motivos:

- Maneja bien monorepos chicos.
- Evita duplicación innecesaria de dependencias.
- Es más estricto que npm con dependencias implícitas.
- Funciona bien con paquetes compartidos internos.

Archivo raíz:

```txt
pnpm-workspace.yaml
```

Con estos workspaces:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 5. Scripts raíz sugeridos

El `package.json` raíz debería actuar como punto de entrada operativo:

```json
{
  "scripts": {
    "mobile": "pnpm --filter mobile start",
    "mobile:android": "pnpm --filter mobile android",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:functions:serve": "supabase functions serve api",
    "supabase:migrations:new": "supabase migration new",
    "supabase:db:reset": "supabase db reset"
  }
}
```

---

## 6. Variables de entorno

Debe existir un `.env.example` en la raíz con las variables necesarias para desarrollo.

Ejemplo inicial:

```txt
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Regla importante:

- La app mobile solo puede usar variables `EXPO_PUBLIC_*`.
- La `SUPABASE_SERVICE_ROLE_KEY` nunca debe estar disponible en la app mobile.
- La service role key solo puede vivir en el entorno seguro de Supabase Edge Functions o en configuración local de desarrollo.

---

## 7. Convenciones de nombres

### 7.1 Roles técnicos

```txt
owner
seller
```

### 7.2 Estados de producto

```txt
available
sold
```

### 7.3 Estados de pago

```txt
paid
partial
unpaid
overdue
```

### 7.4 Estados administrativos de venta

```txt
active
voided
```

### 7.5 Estados de devolución

```txt
return_window
confirmed
with_return
```

### 7.6 Categorías principales

```txt
upper
lower
lingerie
```

---

## 8. Orden recomendado de implementación

1. Crear estructura base del monorepo.
2. Configurar `pnpm` workspaces.
3. Crear app Expo en `apps/mobile`.
4. Crear paquete compartido en `packages/shared`.
5. Inicializar Supabase local en `supabase/`.
6. Crear migraciones base.
7. Crear Edge Function `api` con Hono.
8. Implementar autenticación y perfil actual.
9. Implementar catálogo.
10. Implementar ventas con bloqueo atómico de productos.
11. Implementar pagos posteriores.
12. Implementar devoluciones.
13. Implementar Home y analíticas.
14. Implementar empleadas.
15. Preparar build Android con EAS.

---

## 9. Alcance inicial recomendado

Para evitar construir demasiadas pantallas antes de validar la base, la primera etapa debería incluir:

- Login.
- Perfil actual con rol.
- Catálogo visible.
- Alta de productos con foto.
- Creación de ventas.
- Registro de pago inicial.
- Cambio de producto a vendido.
- Home básico de Dueña con total vendido, cobrado y pendiente.

Después de eso conviene sumar:

- Pagos posteriores.
- Devoluciones.
- Empleadas.
- Comisiones.
- Analíticas completas.

