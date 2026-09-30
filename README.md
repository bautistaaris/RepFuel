# RepFuel

PWA privada para registrar entrenamientos de fuerza, nutrición diaria, peso corporal y progreso. Mobile-first, instalable, single-user, self-hosted.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript estricto
- Tailwind CSS con tokens del diseño Stitch
- Prisma + SQLite (portable a Postgres)
- bcryptjs + cookie de sesión HMAC firmada + CSRF
- Zod para validación
- Recharts para gráficos
- Vitest (unit) + Playwright (E2E)
- Docker + docker-compose con volumen persistente

## Características

- Rutinas: crear, duplicar, reordenar, eliminar
- Ejercicios: biblioteca seed (35+) + creación de personalizados
- Workout activo: stopwatch, sets con check, rest timer **persistente** (se recupera si cerrás la app)
- PRs automáticos: heavier weight, max volume, max reps para un peso
- Nutrición: registro diario por tomas, parser de NL (manual ahora, OpenAI opcional)
- Comidas y alimentos frecuentes
- Peso corporal con tendencia 7d/30d + media móvil 7d
- Dashboard de progreso: 7D / 30D / 3M / 6M / 1A / Todo
- Calendario mensual con resumen por día
- Backup JSON con versión + import con backup automático previo
- PWA: instalable en iPhone/Android, manifest + service worker
- Modo offline parcial (assets estáticos cacheados; nunca se cachea `/api` ni navegación autenticada)

## Privacidad

- Sin signup público. Único admin creado por CLI.
- `robots.txt: Disallow: /`, `<meta name="robots" content="noindex,nofollow,noarchive">` en todas las páginas.
- Contraseña hasheada con bcrypt rounds 12.
- Cookie `rf_session` HttpOnly + Secure (en prod) + SameSite=Lax + HMAC firmada.
- CSRF double-submit cookie para mutaciones.
- Rate limit en `/login`: 5 intentos / 15 min por IP+email.

## Requisitos

- Node.js >= 20
- npm
- Docker (opcional, recomendado para producción)

## Instalación

### 1. Clonar y configurar

```bash
git clone <repo>
cd repfuel
cp .env.example .env
```

Editar `.env` y completar:
- `AUTH_SECRET`: generá con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `ADMIN_EMAIL` y `ADMIN_PASSWORD`

### 2. Instalar y migrar

```bash
npm install
npm run db:migrate
npm run db:seed
```

`db:seed` crea los ejercicios iniciales y el usuario admin.

### 3. Desarrollo

```bash
npm run dev
# http://localhost:3000
```

### 4. Producción local

```bash
npm run build
npm run start
```

### 5. Docker

```bash
docker compose up -d
```

El contenedor expone el puerto 3000. La DB se persiste en el volumen `rep-fuel-data`.

Para aplicar migraciones dentro del contenedor:

```bash
docker compose exec repfuel npx prisma migrate deploy
docker compose exec repfuel node -e "require('child_process').execSync('npx tsx prisma/seed.ts', {stdio:'inherit'})"
```

### 6. Acceder desde el celular con Tailscale

1. Instalar Tailscale en la PC/servidor y en el celular.
2. Login con la misma cuenta en ambos.
3. La PC queda accesible vía su IP Tailscale (ej. `100.x.y.z`).
4. Desde el celular: `http://100.x.y.z:3000`.
5. En iPhone, Safari → Compartir → "Añadir a pantalla de inicio" para instalar la PWA.

Alternativa: correr Tailscale en el host Docker y exponer solo en la interfaz `tailscale0`.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `file:./data/repfuel.db` (default) |
| `AUTH_SECRET` | HMAC secret para firmar cookies (>= 32 chars random) |
| `ADMIN_EMAIL` | Email del admin (seed) |
| `ADMIN_PASSWORD` | Contraseña del admin (seed) — se hashea con bcrypt |
| `NUTRITION_AI_PROVIDER` | `none` (default) \| `openai` |
| `NUTRITION_AI_API_KEY` | API key (solo si provider=openai) |
| `NUTRITION_AI_MODEL` | Modelo OpenAI (default `gpt-4o-mini`) |
| `APP_URL` | URL pública (para OG) |

## Backup

- Exportar: Settings → Backup → Exportar (descarga JSON).
- Importar: Settings → Backup → Importar. Antes de importar se crea un backup automático en `backups/pre-import-<timestamp>.json`.
- Versionado: el JSON incluye `version`. Refusar versiones mayores.

## Tests

```bash
npm run lint
npm run typecheck
npm test                 # unit (vitest)
npm run test:e2e         # E2E (playwright, requiere dev server)
npm run test:e2e:install # descargar chromium la primera vez
```

## Estructura

```
prisma/
  schema.prisma
  seed.ts
public/
  manifest.webmanifest
  sw.js
  icons/
src/
  app/                   # App Router
    api/health/
    inicio/              # home
    entreno/             # rutinas + active workout
    dieta/               # nutrición + objetivos + guardados
    progreso/            # dashboard + peso + workouts/[id]
    calendario/          # mes + día
    biblioteca/          # ejercicios
    settings/
    login/
  components/
    layout/              # AppShell, BottomNav, AppHeader
    ui/                  # Button, Card, Input, ProgressBar, ...
    workouts/            # ActiveWorkout
    nutrition/           # DietaContent, ...
    progress/            # Charts, ...
    routines/            # RoutineForm, RoutineEditor, RoutineActions
    exercises/
    settings/
    calendar/
    auth/
    primitives/
  lib/
    auth.ts
    session.ts
    csrf.ts (vía session)
    rate-limit.ts
    db.ts
    parsers/             # NutritionParser interface + manual + openai
    services/            # workouts, routines, exercises, nutrition, pr, home, bodyWeight, backup
    utils/               # dates, format, volume, cn
    validation/
  actions/               # server actions
  styles/globals.css
  middleware.ts
tests/
  unit/
  e2e/
```

## Decisiones técnicas clave

- **App Router** con Server Components para datos y Client Components para interacción (timer, inputs).
- **Server Actions** con validación Zod en server para todas las mutaciones.
- **Optimistic UI** en logging de sets (rollback on error).
- **Rest timer** persistido como timestamp (`restStartedAt` + `restDuration`) — sobrevive cierre de app.
- **Volume** = Σ(weight × reps) sobre sets completados, calculado server-side.
- **PR detection** corre al marcar set como completo; tipos: HEAVIEST, MAX_VOLUME, MAX_REPS_FOR_WEIGHT.

## Licencia

MIT.