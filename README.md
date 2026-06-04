# RestoFlow — Frontend

SPA en **React 18** para la plataforma **RestoFlow**: gestión multi-tenant de inventario, facturación de proveedores, pagos y flujo de caja en moneda local y USD. Consume la API del backend NestJS (`../backend`).

---

## Tabla de contenidos

- [Características principales](#características-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Rutas y pantallas](#rutas-y-pantallas)
- [Autenticación y contexto de tenant](#autenticación-y-contexto-de-tenant)
- [Capa de API](#capa-de-api)
- [Requisitos previos](#requisitos-previos)
- [Configuración e inicio rápido](#configuración-e-inicio-rápido)
- [Variables de entorno](#variables-de-entorno)
- [Build y despliegue](#build-y-despliegue)
- [Usuarios de demo](#usuarios-de-demo)
- [Relación con el monorepo](#relación-con-el-monorepo)

---

## Características principales

| Módulo UI | Funcionalidad |
|-----------|---------------|
| **Login** | Google OAuth (`@react-oauth/google`) y bypass por email para desarrollo |
| **Onboarding** | Pantalla para usuarios autenticados sin restaurante asignado |
| **Dashboard** | Resumen de flujo de caja por rango de fechas, tasas del día, movimientos manuales y edición/eliminación de transacciones |
| **Billings & Payments** | Facturas, pagos parciales/totales, proveedores (pestañas) |
| **Inventory** | Catálogo de artículos, costos duales, ajuste de stock inline |
| **Exchange Rates** | Historial y registro de tasa diaria USD → moneda local |
| **Superadmin** | Alta de restaurantes, listado de usuarios y asignación de roles |

**Multi-tenant en UI:** selector de restaurante activo en la barra lateral; todas las peticiones operativas envían `x-restaurant-id` automáticamente.

**Diseño:** tema oscuro “glassmorphism”, tipografía **Outfit**, iconos **Lucide React**, CSS Modules por página.

---

## Stack tecnológico

| Tecnología | Uso |
|------------|-----|
| React 18 | UI y hooks |
| TypeScript 5 | Tipado estricto |
| React Router 6 | Rutas y navegación SPA |
| Webpack 5 | Bundling, dev server y proxy |
| Luxon 3 | Fechas (`yyyy-MM-dd`) |
| `@react-oauth/google` | Botón y credencial Google |
| CSS Modules + `index.css` | Estilos globales y por componente |

No usa Create React App ni Vite: el build está configurado manualmente en `webpack.config.js`.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  index.tsx → App.tsx (GoogleOAuthProvider + BrowserRouter)   │
│                    │                                         │
│              AuthProvider (Context)                          │
│                    │                                         │
│     ┌──────────────┼──────────────┐                         │
│     ▼              ▼              ▼                         │
│  Login      Onboarding      RequireAuth → AppLayout          │
│                                  │                           │
│                    ┌─────────────┴─────────────┐            │
│                    ▼                           ▼            │
│              Sidebar + Routes            api.ts (fetch)      │
│         Dashboard / Billings / ...              │            │
└─────────────────────────────────────────────────┼────────────┘
                                                  ▼
                                          Backend REST /api/*
```

### Patrones

- **Estado global de sesión:** `AuthContext` (usuario, restaurantes, tenant activo, login/logout).
- **Estado local por página:** cada módulo carga sus datos con `useEffect` y `api.*`.
- **Servicio API centralizado:** clase `ApiService` en `src/services/api.ts` con manejo de JWT, tenant y errores 401.
- **Rutas protegidas:** componente `RequireAuth` redirige a `/login` o `/onboarding` según el caso.

---

## Estructura del proyecto

```
frontend/
├── src/
│   ├── index.tsx              # Punto de entrada React
│   ├── index.html             # Plantilla HTML (fuente webpack)
│   ├── index.css              # Design tokens y utilidades globales
│   ├── App.tsx                # Router, layout, guards
│   ├── App.module.css         # Shell responsive (sidebar)
│   ├── context/
│   │   └── AuthContext.tsx    # Sesión y tenant activo
│   ├── services/
│   │   └── api.ts             # Cliente HTTP hacia el backend
│   ├── pages/
│   │   ├── Login.tsx          # Autenticación
│   │   ├── Onboarding.tsx     # Usuario sin restaurante
│   │   ├── Dashboard.tsx      # Flujo de caja
│   │   ├── Billings.tsx       # Facturas, pagos, proveedores
│   │   ├── Inventory.tsx      # Inventario
│   │   ├── ExchangeRates.tsx  # Tasas diarias
│   │   └── Superadmin.tsx     # Administración de plataforma
│   └── custom.d.ts            # Tipos para CSS modules y env
├── webpack.config.js          # Dev server, proxy, loaders
├── tsconfig.json
├── package.json
└── dist/                      # Salida de producción (gitignored)
```

---

## Rutas y pantallas

| Ruta | Componente | Acceso |
|------|------------|--------|
| `/login` | `Login` | Público |
| `/onboarding` | `Onboarding` | Autenticado sin tenant (rol `USER`) |
| `/` | `Dashboard` | Autenticado + tenant (o superadmin con contexto) |
| `/billings` | `Billings` | Idem |
| `/inventory` | `Inventory` | Idem |
| `/exchange-rates` | `ExchangeRates` | Idem |
| `/superadmin` | `Superadmin` | Visible en menú si `user.role === 'SUPERADMIN'` |

`historyApiFallback: true` en el dev server permite refrescar rutas profundas en desarrollo.

### Detalle por pantalla

**Dashboard**
- KPIs: entradas/salidas/neto en moneda local y USD.
- Filtro por `startDate` / `endDate` (por defecto últimos 7 días).
- Widget para registrar tasa del día.
- Formulario de movimiento manual (`INFLOW` / `OUTFLOW`, categorías como `SALES_REVENUE`).
- Tabla de transacciones con edición y borrado.
- Conversión automática local ↔ USD según tasa del día seleccionado.

**Billings**
- Pestaña **Billings:** crear/editar/eliminar facturas, registrar pagos, ver pagos por factura (fila expandible).
- Pestaña **Providers:** CRUD de proveedores.
- Sincronización de montos con tasa del día de emisión o pago.

**Inventory**
- Modal crear/editar artículo (SKU, categoría, UOM, costos, reorder).
- Ajuste de stock inline por fila.
- Alertas visuales cuando el stock está bajo el nivel de reorden.

**Exchange Rates**
- Listado histórico y formulario para fijar tasa por fecha.

**Superadmin**
- Crear restaurante (nombre, slug, código y símbolo de moneda).
- Asignar usuario ↔ restaurante con rol `ADMIN` o `STAFF`.
- Eliminar asignaciones.

---

## Autenticación y contexto de tenant

### Flujo de login

1. **Google:** `GoogleLogin` obtiene `credential` (ID token) → `api.loginWithGoogle` → backend valida y devuelve JWT + restaurantes.
2. **Bypass (dev):** email → `api.loginBypass` → mismo contrato de respuesta.

### Persistencia en `localStorage`

| Clave | Contenido |
|-------|-----------|
| `accessToken` | JWT del backend |
| `activeRestaurantId` | UUID del restaurante activo |

### Restauración de sesión

Al montar la app, `AuthProvider` llama `api.getMe()`. Si el token es inválido, se limpia la sesión y se redirige a login.

### Cambio de restaurante

`switchRestaurant(id)` actualiza `activeRestaurantId` y recarga la página (`window.location.reload()`) para refrescar todos los módulos con el nuevo tenant.

### Guards (`App.tsx`)

- **`RequireAuth`:** exige sesión; usuarios `USER` sin restaurante van a `/onboarding`.
- **`SUPERADMIN`:** puede entrar al layout sin tenant; los módulos operativos en sidebar aparecen solo si hay `activeRestaurant` o no es superadmin puro sin selección.

---

## Capa de API

Archivo: `src/services/api.ts`.

### URL base según entorno

| Entorno | `BASE_URL` | Comportamiento |
|---------|------------|----------------|
| **Desarrollo** (`NODE_ENV !== 'production'`) | `''` (vacío) | Peticiones a `/api/...` → proxy de webpack → backend |
| **Producción** | `REACT_APP_API_URL` normalizada | Peticiones absolutas al servidor API |

### Cabeceras automáticas

- `Authorization: Bearer <accessToken>` si existe token.
- `x-restaurant-id: <activeRestaurantId>` en rutas operativas (`useTenantHeader: true` por defecto).
- Rutas de auth y superadmin usan `useTenantHeader: false`.

### Manejo de errores

- Respuestas no OK parsean JSON de error y lanzan el payload.
- **401:** limpia sesión y redirige a `/login`.

Métodos expuestos (1:1 con el backend): auth, superadmin, exchange-rates, providers, billings, payments, cash-flows, inventory. Ver también `../backend/README.md`.

---

## Requisitos previos

- **Node.js** 20+
- **npm**
- Backend RestoFlow en ejecución (por defecto `http://localhost:3000`)
- PostgreSQL levantado (vía `docker compose` en la raíz del monorepo)

---

## Configuración e inicio rápido

### 1. Variables de entorno

```bash
cd frontend
cp .env.example .env
```

Editar `.env` con la URL del API y el Client ID de Google (mismo que en el backend para validar tokens).

### 2. Instalar y arrancar

```bash
npm install
npm start
```

La app queda en **`http://localhost:8080`**.

El dev server proxifica `/api` al valor de `REACT_APP_API_URL` definido en `.env` (ver `webpack.config.js`).

### 3. Flujo típico de desarrollo

```text
Terminal 1 (raíz):     docker compose up -d postgres
Terminal 2 (backend):  cd backend && npm run start:dev
Terminal 3 (frontend):   cd frontend && npm start
```

Abrir `http://localhost:8080/login` y usar un perfil rápido (p. ej. *Trattoria Owner*) o Google.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `REACT_APP_API_URL` | URL del backend (proxy en dev, absoluta en build prod) | `http://localhost:3000` |
| `REACT_APP_GOOGLE_CLIENT_ID` | Client ID OAuth de Google Console | `xxx.apps.googleusercontent.com` |

> En **producción**, `REACT_APP_*` deben estar definidas **antes** de `npm run build`, porque Webpack las inyecta en tiempo de compilación.

Ejemplo en `.env.example` (sin secretos reales).

---

## Build y despliegue

```bash
# Definir API de producción antes del build
set REACT_APP_API_URL=https://api.tu-dominio.com
set REACT_APP_GOOGLE_CLIENT_ID=tu-client-id
npm run build
```

Salida estática en `dist/` (`index.html` + `bundle.[hash].js`).

Sirve `dist/` con cualquier hosting estático (Nginx, S3, Netlify, etc.) configurando **fallback a `index.html`** para rutas del SPA.

### Checklist producción

1. `REACT_APP_API_URL` apunta al backend HTTPS con CORS permitiendo el origen del frontend.
2. `REACT_APP_GOOGLE_CLIENT_ID` coincide con el origen autorizado en Google Cloud Console.
3. Deshabilitar o no exponer el bypass de login en entornos públicos (es solo UI de desarrollo; el endpoint sigue en el backend).
4. No commitear `.env` (está en `.gitignore`).

---

## Usuarios de demo

Datos en `../database/02_seed.sql`. En la pantalla de login, los botones rápidos rellenan:

| Perfil | Email | Uso |
|--------|-------|-----|
| Superadmin | `superadmin@restaurant.com` | Panel superadmin |
| Trattoria Owner | `owner_italy@restaurant.com` | Bella Italia (ADMIN) |
| Taco Shop Owner | `owner_taco@restaurant.com` | El Taco Loco (ADMIN) |
| Sin asignar | `unassigned@restaurant.com` | Flujo onboarding |

---

## Relación con el monorepo

| Carpeta | Rol |
|---------|-----|
| `frontend/` | Esta SPA (puerto 8080 en dev) |
| `backend/` | API NestJS (puerto 3000) — ver [backend/README.md](../backend/README.md) |
| `database/` | Esquema y seeds PostgreSQL |
| `docker-compose.yml` | PostgreSQL 15 con init scripts |

---

## Scripts NPM

| Comando | Acción |
|---------|--------|
| `npm start` | Webpack dev server en `:8080` con HMR y proxy `/api` |
| `npm run build` | Bundle de producción en `dist/` |

---

## Licencia

Proyecto privado (`"private": true` en `package.json`).
