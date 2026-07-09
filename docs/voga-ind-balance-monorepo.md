# Estructura del monorepo — voga.ind balance

> Este documento define la estructura del repositorio para la app mobile, la API Express, las migraciones de Supabase y el código compartido.

---

## 1. Objetivo

El monorepo mantiene juntas las piezas principales:

- App mobile con React Native + Expo.
- Backend con Node.js + Express + TypeScript.
- Migraciones y configuración de Supabase PostgreSQL.
- Tipos, constantes y utilidades compartidas.
- Documentación funcional y técnica.

---

## 2. Estructura propuesta

```txt
voga.ind-balance/
├─ apps/
│  ├─ api/
│  │  ├─ src/
│  │  │  ├─ config/
│  │  │  ├─ lib/
│  │  │  ├─ middlewares/
│  │  │  ├─ modules/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ users/
│  │  │  │  ├─ products/
│  │  │  │  ├─ sales/
│  │  │  │  ├─ payments/
│  │  │  │  ├─ returns/
│  │  │  │  ├─ expenses/
│  │  │  │  └─ reports/
│  │  │  ├─ types/
│  │  │  ├─ app.ts
│  │  │  └─ server.ts
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  └─ mobile/
│     ├─ app/
│     ├─ src/
│     ├─ assets/
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
│  ├─ migrations/
│  ├─ seed/
│  └─ config.toml
│
├─ docs/
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
├─ README.md
└─ tsconfig.base.json
```

---

## 3. Backend `apps/api`

La API usa:

- Node.js.
- Express.
- TypeScript.
- Supabase JS client.
- Render Web Service Starter.

Capas:

```txt
Controller -> Service -> Repository
```

Responsabilidades:

- `routes`: define URLs y middlewares por módulo.
- `controller`: traduce HTTP a llamadas de servicio.
- `service`: contiene reglas de negocio.
- `repository`: accede a Supabase/PostgreSQL.
- `validations`: valida inputs cuando el módulo lo requiere.
- `types`: tipos propios del módulo.

El servidor escucha en:

```ts
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});
```

---

## 4. Mobile `apps/mobile`

Contiene la app Expo/React Native.

Se organiza por funcionalidades:

- `home`
- `catalog`
- `sales`
- `analytics`
- `employees`
- `profile`

La app consume la API mediante `EXPO_PUBLIC_API_URL`.

---

## 5. Supabase

`supabase/` queda reservado para:

- Migraciones SQL.
- Configuración local de Supabase.
- Seeds si hacen falta.

No contiene backend de negocio. La lógica vive en `apps/api`.

---

## 6. Package manager

Se usa `pnpm` workspaces:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## 7. Scripts raíz

```json
{
  "scripts": {
    "api": "pnpm --filter ./apps/api dev",
    "api:build": "pnpm --filter ./apps/api build",
    "api:start": "pnpm --filter ./apps/api start",
    "api:typecheck": "pnpm --filter ./apps/api typecheck",
    "mobile": "pnpm --filter ./apps/mobile start",
    "mobile:android": "pnpm --filter ./apps/mobile android",
    "typecheck": "pnpm -r typecheck"
  }
}
```

---

## 8. Variables de entorno

Backend:

```txt
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Mobile:

```txt
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=
```

Regla crítica:

- `SUPABASE_SERVICE_ROLE_KEY` nunca va en la app mobile.

---

## 9. Orden recomendado de implementación

1. API base con `GET /health` y `GET /auth/me`.
2. Módulo `products`.
3. Módulo `sales` usando RPC `create_sale_atomic`.
4. Módulo `payments`.
5. Módulo `returns`.
6. Módulo `users/employees`.
7. Módulo `reports`.
8. App Expo conectada a la API.
9. Deploy de API en Render.
10. Build Android con EAS.
