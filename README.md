# RepFuel

PWA privada, mobile-first, multi-usuario para registrar entrenamientos de fuerza, nutrición diaria, peso corporal y progreso. Instalable desde Safari/Chrome. Diseñada para uso personal, con acceso por dominio público + HTTPS.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript estricto**
- **Tailwind CSS** con tokens del diseño Stitch
- **PostgreSQL** + Prisma (portable a Neon / Supabase / self-hosted)
- **bcryptjs** + cookie HMAC HttpOnly + CSRF
- **Zod** para validación
- **Recharts** para gráficos
- **Vitest** (unit) + **Playwright** (E2E)
- **Docker** + **docker-compose** (app + postgres) para dev/self-host
- **Vercel** ready para producción con Neon/Supabase

## Características

- **Multi-usuario** con registro público configurable (`ALLOW_PUBLIC_REGISTRATION`).
- **Auth completo**: register, login, logout, email verification, password reset.
- **Rutinas**: crear, duplicar, reordenar, eliminar.
- **Ejercicios**: biblioteca global + personalizados por usuario.
- **Workout activo** con stopwatch, **rest timer persistente** (timestamps server-side).
- **PR detection**: HEAVIEST, MAX_VOLUME, MAX_REPS_FOR_WEIGHT — aislado por usuario.
- **Nutrición**: food entries por toma, parser NL (ManualNutritionParser + OpenAI opcional).
- **Saved foods / saved meals** privados por usuario.
- **Objetivos diarios** configurables.
- **Body weight** con moving avg 7d + deltas 7d/30d + chart.
- **Progress dashboard** con tabs 7D/30D/3M/6M/1A/Todo.
- **Calendario mensual** + resumen por día.
- **Backup JSON v2** solo del usuario (excluye passwordHash, tokens, otros usuarios).
- **Account deletion** con confirmación fuerte.
- **PWA** instalable, manifest + service worker sin cache privado cross-user.
- **Multi-tenant isolation** verificada por tests unitarios + E2E.

## Privacidad

- Sin signup público por defecto configurable (`ALLOW_PUBLIC_REGISTRATION=false` para invite-only).
- `robots.txt: Disallow: /`, `<meta name="robots" content="noindex,nofollow,noarchive">` global.
- Contraseña hasheada con bcrypt rounds 12.
- Cookie `rf_session` HttpOnly + Secure (en prod) + SameSite=Lax + HMAC firmada.
- Email verification tokens y password reset tokens hasheados en DB (HMAC), single-use, con TTL.
- CSP estricta (sin `unsafe-eval`, default-src 'self').
- X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy no-referrer, Permissions-Policy minimal.
- Service Worker NO cachea páginas autenticadas ni `/api/*`. Logout dispara `CLEAR_PRIVATE_CACHE`.

## Requisitos

- **Node.js** >= 20
- **PostgreSQL** >= 14 (local con Docker, Neon, Supabase o cualquier proveedor)
- **npm** o pnpm
- **Docker** (opcional, recomendado para dev/self-host)

## Instalación

### 1. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
DATABASE_URL="postgresql://repfuel:repfuel@localhost:5432/repfuel"
AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
ALLOW_PUBLIC_REGISTRATION="true"
REQUIRE_EMAIL_VERIFICATION="false"
EMAIL_PROVIDER="console"          # o "resend"
EMAIL_FROM="RepFuel <noreply@repfuel.app>"
EMAIL_API_KEY=""                   # si usás Resend
APP_URL="http://localhost:3000"
```

### 2. Dev con Docker (recomendado)

```bash
docker compose up -d postgres      # solo postgres, la app la corrés localmente
npm install
npm run db:migrate
npm run dev                         # http://localhost:3000
```

O todo el stack:

```bash
docker compose up -d                # app + postgres
docker compose exec app npx prisma migrate deploy
```

### 3. Dev local sin Docker

Instalar PostgreSQL localmente, setear `DATABASE_URL`, luego:

```bash
npm install
npm run db:migrate
npm run dev
```

### 4. Producción local

```bash
npm run build
npm run start
```

### 5. Deploy en Vercel + Neon (recomendado)

1. Crear proyecto en [Neon](https://neon.tech), obtener `DATABASE_URL`.
2. Push del repo a GitHub.
3. Crear proyecto en [Vercel](https://vercel.com), importar el repo.
4. Configurar variables de entorno en Vercel:
   - `DATABASE_URL` (de Neon)
   - `AUTH_SECRET` (32 chars random)
   - `ALLOW_PUBLIC_REGISTRATION`
   - `REQUIRE_EMAIL_VERIFICATION`
   - `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_API_KEY` (si usás Resend)
   - `NUTRITION_AI_*` (opcional)
   - `APP_URL` (URL de producción, ej `https://repfuel.app`)
5. Build command: `prisma generate && next build` (definido en Vercel config o `package.json`).
6. **Migraciones**: NO ejecutar migraciones automáticamente en cada request. Conectar vía `vercel env pull` y correr localmente contra la DB de producción:

   ```bash
   vercel env pull .env.production
   DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d= -f2-) npx prisma migrate deploy
   ```

   O vía GitHub Actions con un job de release que corra `prisma migrate deploy` antes del deploy.

7. **Dominio**: en Vercel → Settings → Domains, agregar `repfuel.app` (o subdominio). HTTPS automático.

### 6. Acceder desde el celular

Cualquier red funciona (WiFi, 4G/5G, universidad, gimnasio). Tailscale ya NO es necesario.

Para iPhone: Safari → Compartir → "Añadir a pantalla de inicio" para instalar la PWA.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | HMAC secret para sesiones y tokens (>= 32 random chars) |
| `ALLOW_PUBLIC_REGISTRATION` | `true` (público) o `false` (invite-only) |
| `REQUIRE_EMAIL_VERIFICATION` | `true` para requerir email verificado |
| `EMAIL_PROVIDER` | `console` (dev) o `resend` (prod) |
| `EMAIL_FROM` | From header (ej: `RepFuel <noreply@repfuel.app>`) |
| `EMAIL_API_KEY` | API key de Resend si provider=resend |
| `NUTRITION_AI_PROVIDER` | `none` o `openai` |
| `NUTRITION_AI_API_KEY` | OpenAI key |
| `NUTRITION_AI_MODEL` | default `gpt-4o-mini` |
| `APP_URL` | URL pública (usada en emails) |

## Backup

- **Export**: Settings → Datos → Exportar (descarga JSON v2 con solo tus datos).
- **Import**: Settings → Datos → Importar. Antes de importar crea `backups/pre-import-<timestamp>.json`.
- Lo que **NO** se exporta: `passwordHash`, tokens, sesiones, datos de otros usuarios.

## Tests

```bash
npm run lint
npm run typecheck
npm test                 # 41 unit tests
npm run test:e2e         # Playwright E2E
npm run test:e2e:install # primera vez: chromium
```

## Estructura

```
prisma/
  schema.prisma          # PostgreSQL multi-tenant
  seed.ts                # global exercises + admin opcional
public/
  manifest.webmanifest
  sw.js                  # multi-user cache strategy
  icons/
src/
  app/
    api/health/          # health endpoint
    inicio/              # home dashboard
    login/, register/, forgot-password/, reset-password/, verify-email/
    entreno/             # rutinas + workout activo
    dieta/               # nutrition
    progreso/            # dashboards
    calendario/
    biblioteca/          # ejercicios
    settings/            # account settings
  components/            # UI, auth, workouts, nutrition, progress, etc.
  lib/
    auth.ts              # bcrypt helpers
    session.ts           # Node.js session cookies
    session-edge.ts      # Edge session decoder for middleware
    csrf.ts (en session)
    crypto.ts            # token hashing, email normalization
    email.ts             # EmailService interface + Console/Resend
    rate-limit.ts
    db.ts                # Prisma singleton
    auth-user.ts         # requireUser/getCurrentUser
    data-access.ts       # getOwnedX helpers
    parsers/             # NutritionParser interface + Manual + OpenAI
    services/            # business logic (workouts, routines, exercises, ...)
    utils/               # dates, format, volume, cn
  actions/               # server actions por módulo
  middleware.ts          # CSP, security headers, auth gating, public paths
tests/
  unit/
  e2e/
  stubs/server-only.ts    # vitest stub
```

## Decisiones técnicas clave

- **PostgreSQL** vía Prisma. SQLite quedó como referencia histórica.
- **Multi-tenant por userId**: cada query privada filtra por `userId` desde sesión.
- **Tokens hasheados**: EmailVerification y PasswordReset se guardan como `HMAC(token)` en DB.
- **Rest timer**: timestamps server-side. Recupera correctamente si la app se cierra.
- **Volume** = Σ(weight × reps) sobre sets completados.
- **PR detection** siempre contra el historial del mismo usuario.
- **Backup v2**: solo datos del requesting user. El `user.id` en el JSON es informativo; el import siempre asigna a `currentUser.id`.
- **Service Worker** agresivamente bypass para páginas autenticadas y API.

## Seguridad

### Defensa en profundidad

1. **Middleware** bloquea rutas no autenticadas.
2. **Server actions / API** verifican sesión con `requireUser`.
3. **Service layer** filtra por `userId` en cada query.
4. **Data-access helpers** (`getOwnedX`) usan `notFound()` en lugar de `forbidden()` para no filtrar existencia de recursos.
5. **Prisma** con índices apropiados para queries rápidas por userId.

### Reporte de seguridad

Tests cubiertos:

- Cross-user workout completion → rechaza
- Cross-user routine deletion → rechaza
- Cross-user routine creation conflict (same name) → permitido
- Cross-user food entry listing → aislado
- Cross-user body weight → aislado
- Cross-user PR detection → aislado por userId
- Cross-user backup export → solo datos del requesting user
- Backup import con user.id adulterado → asigna a currentUser.id

## Licencia

MIT.