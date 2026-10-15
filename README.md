# Sistema de Inventario y Producción — API

![CI](https://github.com/danbmz/API-SGPI/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## English summary

REST API for an inventory and production management system for a plastic plant. It covers production orders, shift reports, raw material / pigment / ground-material inventory, a regrinding workflow, audit logging, a dashboard and exportable reports, with five role-based profiles.

**Live demo:** [Web app](https://sistema-gestion-produccion.vercel.app/) · [Status page](https://stats.uptimerobot.com/XJH1CFhTF5) · [Frontend repository](https://github.com/danbmz/Frontend-SGPI)
Hosted on free tiers: the first request after a quiet period can be slow.

**Demo accounts** (demo data only): `admin01`, `programador01`, `supervisor01`, `pigmentos01`, `molino01` — all use the password `Test1234!`.

**Highlights**

- **Authentication and access control:** JWT in `httpOnly` cookies, refresh tokens stored as hashes and revocable, `argon2` password hashing, per-role authorization, and rate limiting (stricter on login).
- **Data integrity:** every inventory change is recorded in a movement history protected by database `CHECK` constraints; multi-step operations run in transactions; extensive domain validations.
- **Typed API contracts:** request validation and response serialization with TypeBox schemas.
- **Full audit trail** of user actions, searchable by module, user and date range.
- **Automated quality checks:** 7 smoke-test suites (Vitest + Supertest), CI on GitHub Actions with a throwaway PostgreSQL container, weekly Dependabot updates.
- **Observability:** Sentry for unexpected errors and UptimeRobot for availability.

**Stack:** Node.js 22 · TypeScript · Fastify · Prisma 7 · PostgreSQL (Supabase) · TypeBox · Vitest / Supertest · GitHub Actions · Sentry · Render + Vercel.

**Run it locally:** see section 7 below (the commands are language-independent). The detailed documentation follows in Spanish.

---

## Español

## 1. Descripción

API REST de un sistema de control de inventario y producción para una planta de plásticos. Cubre pedidos y órdenes de producción, reportes de avance por turno, inventario de materia prima, pigmentos, material molido y producto terminado, el flujo de molienda, auditoría, un dashboard y reportes exportables.

Esta API y el diseño de las tablas se hicieron a partir de los procesos reales de una fábrica de plásticos: desde que se programa un pedido y se genera su orden de producción, pasando por el reporte de avance de cada turno (piezas, merma, plasta, sobrantes y paros), hasta el manejo del material pigmentado, la molienda del material recuperado y la salida del producto terminado. Los roles del sistema (programador, supervisor, pigmentos, molino y administrador) corresponden a los puestos que intervienen en ese flujo. Los datos del demo son ficticios.

Este repositorio contiene el **backend**. El frontend está en [este repositorio](https://github.com/danbmz/Frontend-SGPI).

## 2. Demo en vivo

| | |
|---|---|
| Aplicación web | [sistema-gestion-produccion.vercel.app](https://sistema-gestion-produccion.vercel.app/) |
| Estado del servicio | [Página de estado](https://stats.uptimerobot.com/XJH1CFhTF5) |

**Usuarios de prueba.** Todos usan la contraseña `Test1234!`:

| Rol | Usuario | Qué puede hacer |
|---|---|---|
| Administrador | `admin01` | Supervisión de todo, Dashboard, Reportes, Auditoría |
| Programador | `programador01` | Pedidos, órdenes y salida de producto terminado |
| Supervisor | `supervisor01` | Avances de turno |
| Pigmentos | `pigmentos01` | Material, sobrantes, solicitudes, incidencias e inventario |
| Molino | `molino01` | Confirmación de recepción y moliendas |

> Son datos de demostración. La API corre en un plan gratuito, así que la primera petición tras un periodo sin tráfico puede tardar. Estas credenciales son solo del demo y no deben usarse en ningún despliegue real.

## 3. Stack técnico

| Capa | Tecnología |
|---|---|
| Runtime y lenguaje | Node.js 22+, TypeScript |
| Framework | Fastify |
| Validación y contratos | TypeBox |
| Base de datos y ORM | PostgreSQL (Supabase), Prisma 7 con `@prisma/adapter-pg` |
| Seguridad | JWT, `argon2`, `@fastify/cookie`, `@fastify/cors`, `@fastify/rate-limit` |
| Pruebas | Vitest, Supertest |
| CI/CD | GitHub Actions, Dependabot |
| Monitoreo | Sentry, UptimeRobot |
| Despliegue | Render (API), Vercel (frontend), Supabase (base de datos) |

## 4. Qué hace el sistema

- **Administrador:** supervisa todos los módulos; Dashboard (alertas, indicadores, gráficas, desempeño por operador, pedidos en progreso); Reportes por rango de fechas con exportación a Excel; Auditoría con filtros; gestión de usuarios y catálogos.
- **Programador:** pedidos y líneas de detalle (con fecha de entrega); órdenes de producción (crear, activar, pausar, reanudar, cancelar); salida de producto terminado por venta directa o entrega de pedido.
- **Supervisor:** abre y cierra avances de turno con piezas buenas y defectuosas, merma, plasta, sobrante, tiempos de paro, solicitudes de material extra e incidencias de material mal pigmentado.
- **Pigmentos:** confirma el material de las órdenes, sustituye material pigmentado, confirma sobrantes, atiende solicitudes e incidencias, y registra entradas de proveedor y ajustes manuales de inventario.
- **Molino:** confirma la recepción de merma, plasta y piezas, y registra moliendas combinando avances e incidencias del mismo tipo de material.

## 5. Arquitectura

```mermaid
flowchart LR
  U["Navegador"] -->|"/ y /api/*"| V["Vercel · Frontend React"]
  V -->|"reescritura de /api/*"| R["Render · API Fastify"]
  R --> S[("Supabase · PostgreSQL")]
  R -.->|"errores inesperados"| E["Sentry"]
  M["UptimeRobot"] -.->|"/health/db cada 5 min"| R
```

El navegador solo habla con un dominio. Vercel reescribe las peticiones de `/api/*` hacia la API, por lo que las cookies de sesión son del mismo sitio (`SameSite=Lax`) y no es necesario habilitar cookies de terceros. En un despliegue con dominio propio, el frontend y la API pueden vivir en subdominios del mismo sitio con la misma configuración.

## 6. Decisiones técnicas destacadas

### Seguridad

- **Sesiones:** JWT en cookies `httpOnly`; refresh tokens guardados como hash en la base de datos y revocables. El cierre de sesión por inactividad se distingue del cierre voluntario en la auditoría.
- **Contraseñas** con `argon2`.
- **Autorización por rol** en cada módulo; el rol Administrador conserva acceso de supervisión.
- **Límite de peticiones:** 100 por minuto en general y 5 por minuto en el inicio de sesión. Se basa en la IP del cliente; en un despliegue con dominio propio debe ajustarse el número de proxies de confianza.
- **Errores:** el cliente solo recibe mensajes genéricos; el detalle va a los logs y a Sentry.
- **Respuestas** con `Cache-Control: no-store`, para que ninguna caché intermedia conserve datos autenticados.
- **Base de datos:** la aplicación se conecta con un usuario de privilegios mínimos (no con el superusuario), la Data API de Supabase está desactivada y el SSL es obligatorio.
- **Auditoría:** bitácora de acciones (módulo, acción, entidad, usuario, IP) consultable por el Administrador.
- **Dependencias:** actualizaciones semanales con Dependabot, `npm audit` revisado y las excepciones documentadas.
- **Sentry** con recolección de datos restringida: sin datos de usuario, cookies ni cuerpos de petición.

### Integridad de datos

- Cada movimiento de inventario queda en un **historial** protegido por restricciones `CHECK` en la base de datos: aritmética del movimiento, signo según el tipo y exclusividad del material.
- Las operaciones compuestas se ejecutan dentro de **transacciones**.
- **Validaciones de dominio:** coherencia del tipo de material entre materia prima, pigmento y producto; catálogos activos; máquina disponible; pedidos abiertos; sin sobre-entrega; el producto debe pertenecer al pedido; no se cancela un pedido con órdenes en progreso o pausadas, y las órdenes en borrador o activas se cancelan en cascada.
- **Contratos con TypeBox:** validan la entrada y serializan la respuesta con esquemas.
- **Migraciones versionadas** con Prisma Migrate; las restricciones `CHECK` viajan dentro de la migración inicial.

### Calidad y operación

- **7 suites de smoke tests** (Vitest + Supertest) sobre los flujos críticos: autenticación y roles, pedidos, órdenes, avances de turno, pigmentos, molino y salida de producto.
- **CI en GitHub Actions:** levanta un PostgreSQL 16 efímero, aplica migraciones y semilla, compila (verifica tipos) y ejecuta las pruebas en cada push y Pull Request.
- **Monitoreo:** Sentry para errores inesperados y UptimeRobot sobre `/health` y `/health/db`.
- **Despliegue:** Render, Vercel y Supabase, con la API detrás de dos proxies.

## 7. Cómo correrlo en local

**Requisitos:** Node.js 22.12 o superior, npm, y una base PostgreSQL (un proyecto de Supabase o un contenedor local).

```bash
git clone https://github.com/danbmz/API-SGPI.git
cd API-SGPI
npm install
cp .env.example .env        # completa los valores (sección 8)
npx prisma generate
npx prisma migrate deploy   # crea las tablas y las restricciones
npx prisma db seed          # usuarios y catálogos de ejemplo
npm run dev
```

La API queda en `http://localhost:3000`.

**PostgreSQL local con Docker** (equivale a lo que usa el CI; requiere `DATABASE_SSL=false`):

```bash
docker run --name inventario-db -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=inventario -p 5432:5432 -d postgres:16
```

con `DATABASE_URL=postgresql://test:test@localhost:5432/inventario`.

**Scripts**

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga |
| `npm run build` | Genera el cliente de Prisma y compila a `dist/` |
| `npm start` | Arranca la versión compilada, con Sentry precargado |
| `npm test` | Ejecuta los smoke tests |

**Pruebas.** Necesitan una base con la semilla aplicada y un archivo `.env.test`. Crean pedidos, órdenes y movimientos de inventario, así que **no las ejecutes contra una base con datos reales**. Corren archivo por archivo, porque el pooler de sesión de Supabase limita las conexiones simultáneas.

## 8. Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión de PostgreSQL |
| `FRONTEND_URL` | Sí | Origen exacto del frontend (CORS), sin barra final |
| `COOKIE_SECRET` | Sí | Secreto para firmar cookies |
| `JWT_SECRET` | Sí | Secreto para firmar los tokens |
| `NODE_ENV` | Recomendada | `production` en el despliegue (activa cookies `Secure`) |
| `PORT` | No | Por defecto 3000; en un host lo asigna la plataforma |
| `DATABASE_SSL` | No | `false` solo para un PostgreSQL sin SSL (local o CI) |
| `SENTRY_DSN` | No | Si falta, Sentry queda apagado |

Genera los secretos con `openssl rand -hex 32`, distintos en cada entorno.

## 9. Estructura del proyecto

```
.
├── .github/workflows/ci.yml   # integración continua
├── prisma/
│   ├── schema.prisma
│   └── migrations/            # migraciones versionadas
├── scripts/seed.ts            # datos de ejemplo
├── src/
│   ├── app.ts                 # construcción de la app
│   ├── server.ts              # arranque
│   ├── instrument.ts          # inicialización de Sentry
│   ├── config/env.ts          # variables de entorno validadas
│   ├── plugins/               # CORS, cookies, JWT, errores, autenticación
│   └── modules/               # un directorio por módulo
│       └── <modulo>/          # schema, service y routes
├── test/                      # smoke tests y helpers
├── prisma.config.ts
├── tsconfig.json
├── tsconfig.build.json
└── vitest.config.ts
```

## 10. Problemas conocidos

- **`overrides` en `package.json`.** Prisma arrastra dos dependencias internas con avisos de seguridad (`deepmerge-ts` y `mysql2`), sin una versión estable que las corrija por sí sola. Se fuerzan versiones corregidas con `overrides`. `mysql2` solo lo usa una herramienta de Prisma para MySQL y este proyecto usa PostgreSQL. Son temporales y se retiran cuando Prisma publique versiones con las dependencias ya corregidas.
- **Plan gratuito.** El servicio puede tardar en responder tras un periodo sin tráfico, y un monitor lo mantiene activo.
- **Límite de conexiones.** El pooler de sesión de Supabase admite 15 conexiones simultáneas, por eso las pruebas corren en secuencia.
- **Frontend.** Sus propios problemas conocidos están en su repositorio.

## 11. Autor

**Daniel Bermudez** — [LinkedIn](https://www.linkedin.com/in/dev-daniel-bermudez/) · [Correo](mailto:danbmz007@gmail.com)

Este proyecto se distribuye bajo la [licencia MIT](LICENSE).