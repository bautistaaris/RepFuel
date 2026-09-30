# RepFuel — Implementation Plan

> **For agentic workers:** Pasos en bloques verificables. Cada bloque termina con un check (lint+typecheck+tests) y un commit. La spec viaja con este plan.

**Goal:** Construir RepFuel end-to-end: PWA privada mobile-first de entrenamiento + nutrición, single-user, self-hosted, Docker-ready, que cumple los 43 puntos del brief.

**Architecture:** Next.js 15 App Router + TS strict + Tailwind (tokens Stitch) + Prisma/SQLite + bcrypt/JWT-cookie auth + Server Actions + Zod + Recharts + Playwright/Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-repfuel-design.md`

## Global Constraints

- Node >= 20, pnpm/npm, Windows-friendly.
- TypeScript strict. Sin `any` salvo wrapper justificado.
- Tokens de color EXACTOS de la spec — no inventar nuevos.
- Mobile-first: 375, 390, 393, 430 px. safe-area-inset respetado.
- No emojis en UI generada salvo los ya en el diseño (⚡ 🔥 🏆).
- Sin commit de `.env`, `data/*.db`, `node_modules`, `.next`, `backups/`.
- Cada bloque termina con: `npm run lint && npm run typecheck && npm test` passing + commit.

---

## Bloque 0 — Scaffolding + design system + infra base

- [ ] Init Next.js 15 (App Router, TS, Tailwind v3) en la raíz. Sin `create-next-app` interactivo.
- [ ] Configurar `tailwind.config.ts` con la paleta + tipografía + spacing + radius de la spec.
- [ ] `globals.css` con `@layer base` importando Inter y Material Symbols Outlined.
- [ ] `next.config.mjs` con `output: 'standalone'` (Docker).
- [ ] Instalar: `prisma`, `@prisma/client`, `bcryptjs`, `zod`, `recharts`, `lucide-react`, `clsx`, `iron-session` (o custom HMAC), `@t3-oss/next-env`, `next-themes` no necesario (dark fixed).
- [ ] Dev: `vitest`, `@vitest/ui`, `@testing-library/react`, `playwright`, `@types/*`.
- [ ] `.gitignore`, `.env.example`, `.dockerignore`.
- [ ] Prisma init. `schema.prisma` completo de la spec.
- [ ] `prisma/seed.ts`: 30 ejercicios seed (pecho, espalda, pierna, hombro, brazo, core) + admin user.
- [ ] `package.json` scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `db:migrate`, `db:seed`, `seed:admin`.
- [ ] Verificar: `npm run lint`, `npm run typecheck`, `npm run build` pasan.

Commit: `chore: scaffold Next.js + Prisma + design tokens`

---

## Bloque 1 — Auth (single user)

- [ ] `src/lib/auth.ts`: `hashPassword`, `verifyPassword` (bcrypt rounds 12).
- [ ] `src/lib/session.ts`: `createSession(userId)`, `getSession()`, `destroySession()` con cookie `rf_session` HMAC-firmada (HttpOnly, SameSite=Lax, Secure en prod).
- [ ] `src/lib/csrf.ts`: genera token random, lo guarda en cookie `csrf_token` (no HttpOnly) y exporta `verifyCsrf(headerToken, cookieToken)`.
- [ ] `src/lib/rate-limit.ts`: token bucket en memoria para login (5/15min/IP).
- [ ] Middleware Next.js `src/middleware.ts`: redirige a `/login` si no hay sesión en rutas protegidas; bloquea indexación.
- [ ] `src/app/login/page.tsx`: form email + password. Server action valida Zod, rate limit, lookup user, verify, create session.
- [ ] `/api/health` route 200.
- [ ] Tests: `tests/unit/auth.test.ts` (hash + verify), `tests/unit/csrf.test.ts`.
- [ ] Verificar: lint/typecheck/tests.

Commit: `feat(auth): single-user login con session + CSRF + rate limit`

---

## Bloque 2 — Layout + Design System componentes

- [ ] `src/app/layout.tsx`: aplica dark mode, carga fonts, safe-area CSS, `noindex` meta.
- [ ] `src/components/primitives/Icon.tsx`: wrapper Material Symbols + Lucide.
- [ ] `src/components/ui/Button.tsx` (variants: primary, secondary, ghost, danger, sizes).
- [ ] `src/components/ui/Card.tsx`, `Input.tsx`, `Textarea.tsx`, `Badge.tsx`, `ProgressBar.tsx`.
- [ ] `src/components/ui/Select.tsx` (native con styling Stitch).
- [ ] `src/components/ui/Sheet.tsx` (bottom sheet con animation).
- [ ] `src/components/ui/Modal.tsx`.
- [ ] `src/components/layout/BottomNav.tsx` (4 items: Inicio, Entreno, Dieta, Progreso), respeta safe-area.
- [ ] `src/components/layout/AppShell.tsx` (envuelve contenido, sticky bottom nav).
- [ ] `src/components/layout/Header.tsx` (back button + title + right slot).
- [ ] `src/app/page.tsx` redirect a `/inicio` después de auth.
- [ ] Verificar: lint/typecheck.

Commit: `feat(ui): design system + layout base`

---

## Bloque 3 — Prisma schema + migrations + seed ejecutable

- [ ] `prisma/schema.prisma` final con todas las entidades de la spec.
- [ ] `npm run db:migrate` crea migración.
- [ ] `prisma/seed.ts` ejecuta 30 ejercicios + admin user desde `.env`.
- [ ] `npm run db:seed` corre el seed.
- [ ] `src/lib/db.ts` Prisma singleton (no multiple instances en dev).
- [ ] Verificar: `npm run build` con DB inicializada.

Commit: `feat(db): schema Prisma completo + seed inicial`

---

## Bloque 4 — Exercises (biblioteca) + Routines CRUD

- [ ] Server actions `src/actions/exercises.ts`: `listExercises`, `createCustomExercise`, `updateExercise`, `deleteCustomExercise`.
- [ ] `src/lib/validation/exercises.ts` Zod schemas.
- [ ] `/biblioteca` page: lista con filtro muscleGroup, búsqueda.
- [ ] Modal/Sheet crear ejercicio.
- [ ] Server actions `src/actions/routines.ts`: CRUD, `duplicateRoutine(id)`, `reorderExercises(routineId, orderedIds[])`.
- [ ] `/entreno` page: lista de rutinas.
- [ ] `/entreno/[id]` page: detalle editable (drag handle para reorder, "Añadir ejercicio", "Duplicar").
- [ ] Tests unit: `tests/unit/routine-positioning.test.ts` (reorder produce positions 0..n sin colisiones).
- [ ] Verificar: lint/typecheck/tests.

Commit: `feat(routines): CRUD + biblioteca de ejercicios`

---

## Bloque 5 — Workout flow (start, active, sets, rest, finish)

- [ ] `src/lib/services/pr.ts`: `detectPR(exerciseId, newSet)` → { isPR, type }. Tipos: HEAVIEST, MAX_VOLUME, MAX_REPS_FOR_WEIGHT.
- [ ] `src/lib/services/workouts.ts`: `startWorkout(routineId)` clona RoutineExercise → WorkoutExercise + N sets vacíos; `completeWorkout(id)` calcula métricas; `toggleSet(setId, completed)`; `updateSet(setId, data)`; `addSet(workoutExerciseId)`; `removeSet(setId)`; `startRest(setId, durationSec)`; `skipRest(setId)`.
- [ ] `src/lib/utils/volume.ts`: pure functions `volume(weight, reps)`, `workoutVolume(sets[])`, `workoutTotals(workout)`.
- [ ] Server actions workouts.ts (CSRF + Zod).
- [ ] `/entreno/active` page: header stopwatch (cliente calcula desde `startedAt` server), `RestTimer` sticky con countdown real desde `restStartedAt`, cards por ejercicio.
- [ ] `src/components/workouts/ExerciseCard.tsx` (anterior, sets inputs, check toggle).
- [ ] `src/components/workouts/SetRow.tsx` (controlled inputs, optimistic).
- [ ] `src/components/workouts/RestTimer.tsx` (sticky, +30s, skip).
- [ ] Modal resumen al finalizar.
- [ ] Tests: `tests/unit/volume.test.ts`, `tests/unit/pr.test.ts`, `tests/unit/workout-totals.test.ts`.
- [ ] Verificar: lint/typecheck/tests.

Commit: `feat(workouts): start/active/rest/finish + PR detection`

---

## Bloque 6 — Nutrition (foods, meals, parser)

- [ ] `src/lib/parsers/types.ts`: interface `NutritionParser`.
- [ ] `src/lib/parsers/manual.ts`: `ManualNutritionParser` — extrae números + nombres de comida conocidos del catálogo seed; si no conoce devuelve estimate con `confidence: 0.3`.
- [ ] `src/lib/parsers/openai.ts`: stub que llama API si provider=openai, throws error si no.
- [ ] `src/lib/services/nutrition.ts`: `addFoodEntry`, `listFoodEntries(date)`, `dailyTotals(date)`, `getOrCreateDailyTarget`.
- [ ] `src/actions/nutrition.ts`: server actions.
- [ ] `/dieta` page: header macros con progress bars, lista de tomas por mealType.
- [ ] Bottom sheet "Agregar comida" con NL mode.
- [ ] `SavedFood` y `SavedMeal`: CRUD + `/dieta/guardados`.
- [ ] `/dieta/objetivos` form editable.
- [ ] Tests: `tests/unit/macros.test.ts` (totals correctos), `tests/unit/parser.test.ts`.
- [ ] Verificar: lint/typecheck/tests.

Commit: `feat(nutrition): foods + meals + parser + saved`

---

## Bloque 7 — Body weight + Progress dashboard + history

- [ ] `src/lib/services/bodyWeight.ts`: CRUD + métricas (`current`, `delta7`, `delta30`, `movingAvg7`).
- [ ] `src/lib/utils/dates.ts`: helpers rango.
- [ ] `src/actions/bodyWeight.ts`.
- [ ] `/progreso/peso` page con chart Recharts + lista + form.
- [ ] `src/lib/services/progress.ts`: agrega workouts por rango, volume semanal, frecuencia, PRs.
- [ ] `/progreso` dashboard con tabs 7D/30D/3M/6M/1A.
- [ ] `/progreso/ejercicios/[id]` evolución histórica (peso máx, volumen, reps).
- [ ] `/progreso/rutinas/[id]` histórico.
- [ ] Tests: `tests/unit/body-weight.test.ts` (moving avg, deltas).
- [ ] Verificar: lint/typecheck/tests.

Commit: `feat(progress): body weight + dashboard + charts`

---

## Bloque 8 — Home + Calendar + Settings (backup/restore)

- [ ] `src/lib/services/home.ts`: agrega para home (sesión programada hoy, actividad reciente, nutrición hoy, peso, métricas semanales).
- [ ] `/inicio` page replicando Stitch (greeting, sesión, nutrición, métricas, actividad).
- [ ] `/calendario` page mensual con dots por workout/nutrition/weight.
- [ ] `/calendario/[date]` summary día.
- [ ] `src/lib/services/backup.ts`: `exportBackup()`, `importBackup(json, options)`. Crea `.bak` automático.
- [ ] `/settings` page: objetivos, backup/restore, weekly goal, logout.
- [ ] Tests: `tests/unit/backup.test.ts` (roundtrip).
- [ ] Verificar: lint/typecheck/tests.

Commit: `feat(home,calendar,settings,backup)`

---

## Bloque 9 — PWA + Docker + Docs

- [ ] `public/manifest.webmanifest`.
- [ ] `public/sw.js`: precache + cache-first assets + network-first nav + bypass auth.
- [ ] Script que registra SW (`app/layout.tsx`).
- [ ] Icons en `public/icons/` (192, 512, maskable 512, apple-touch 180).
- [ ] `next.config.mjs`: headers PWA.
- [ ] `Dockerfile` multi-stage (deps → builder → runner, output standalone).
- [ ] `docker-compose.yml` con volumen `rep-fuel-data:/app/data`.
- [ ] `robots.txt` Disallow /.
- [ ] README completo: descripción, stack, instalación, env, migraciones, seed admin, dev, prod, Docker, Tailscale, backup/restore, troubleshooting.
- [ ] Verificar: build de Next pasa, `docker build` OK si docker disponible.

Commit: `feat(pwa,docker,docs)`

---

## Bloque 10 — Tests E2E + verificación final

- [ ] `playwright.config.ts` con baseURL.
- [ ] `tests/e2e/workout-flow.spec.ts`: login → home → empezar → rutina → registrar 3 sets → finalizar → ver historial.
- [ ] `tests/e2e/nutrition-flow.spec.ts`: login → dieta → agregar NL → confirmar → ver totales.
- [ ] `npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build` todo verde.
- [ ] Smoke: levantar dev server, curl `/api/health` 200.

Commit: `test(e2e): workout + nutrition flows`

---

## Notas de ejecución

- Trabajar por bloques. No avanzar al siguiente hasta que el anterior pase verificación.
- Si un bloque requiere cambios en otro, ajustar sin romper contratos previos.
- Tests unitarios PRIMERO cuando aplique (TDD).
- Commit pequeño por bloque.
- Documentar decisiones técnicas en `docs/superpowers/decisions.md` cuando sean no triviales.