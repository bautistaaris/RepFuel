# RepFuel — Design Spec

**Fecha:** 2026-09-30
**Tipo:** Aplicación personal (PWA mobile-first) de entrenamiento + nutrición
**Clasificación:** Architectural (nuevo proyecto desde cero)

## 1. Producto

RepFuel es una PWA privada single-user para registrar entrenamientos de fuerza, nutrición diaria, peso corporal y progreso. Instalable como app desde Safari/Chrome en iPhone/Android. Diseñada para uso diario personal, no pública.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS v3 (config personalizada con tokens Stitch) |
| DB | Prisma + SQLite (archivo). DB schema port-able a Postgres |
| Auth | bcryptjs + cookie de sesión firmada HttpOnly + SameSite=Lax + CSRF token |
| Validación | Zod |
| Charts | Recharts |
| Iconos | Material Symbols Outlined (CDN / self-hosted) + Lucide |
| Tests | Vitest (unit) + Playwright (E2E) |
| PWA | `manifest.webmanifest` + service worker propio (next-pwa minimal) |
| Container | Docker + docker-compose, volumen para `/app/data` |

## 3. Decisiones arquitectónicas

- **App Router** con Server Components para datos y Client Components para interacción (rest timer, inputs de series).
- **Server Actions** para mutaciones. Validación Zod en server siempre.
- **Optimistic UI** en logging de series (rollback on error).
- **Single user**: la BD tiene una sola fila `User` creada por CLI (`pnpm seed:admin`). No hay signup público.
- **Auth**: cookie `rf_session` firmada con `AUTH_SECRET` (HMAC). CSRF via header `x-csrf-token` validado contra cookie `csrf_token` para mutaciones.
- **Rest timer**: persistido en BD (`restStartedAt`, `restDuration`). El cliente calcula remaining desde `Date.now()`. Recupera correctamente si se cerró la app.
- **Volume** = sum(weight × reps) sobre sets completados. Calculado server-side.
- **PR detection**: por ejercicio, se compara el set actual contra el histórico. Tipos: heaviest weight, max volume en un set, max reps para un peso dado.
- **Nutrition parser**: interfaz `NutritionParser` con `ManualNutritionParser` (parsing local naive por ahora) + preparado para `OpenAINutritionParser` detrás de `NUTRITION_AI_PROVIDER`.
- **Backup**: `BackupService.export()` / `.import(version, data)` con validación Zod y backup automático a `.bak` antes de sobreescribir.

## 4. Design System (extraído de Stitch)

### 4.1 Colores (Material 3 dark)

primary:           #caf300  (lime)
primary-fixed:     #caf300
on-primary-fixed:  #171e00
primary-container: #caf300
on-primary:        #2a3400
surface-tint:      #b0d500
inverse-primary:   #536600
on-primary-container: #596c00
on-primary-fixed-variant: #3e4c00

secondary:         #7bd0ff  (sky)
secondary-fixed:   #c4e7ff
secondary-fixed-dim: #7bd0ff
on-secondary:      #00354a
on-secondary-container: #00374d
on-secondary-fixed: #001e2c
on-secondary-fixed-variant: #004c69

tertiary:          #ffffff  (placeholder, usamos #ffb2b7)
tertiary-fixed-dim: #ffb2b7
tertiary-fixed:    #ffdadb
on-tertiary:       #67001b
on-tertiary-container: #c51640
on-tertiary-fixed: #40000d
on-tertiary-fixed-variant: #92002a

error:             #ffb4ab
on-error:          #690005
error-container:   #93000a
on-error-container: #ffdad6

background:        #111317
surface:           #111317
surface-dim:       #111317
surface-bright:    #37393d
surface-container-lowest: #0c0e11
surface-container-low:    #1a1c1f
surface-container:        #1e2023
surface-container-high:   #282a2d
surface-container-highest: #333538
surface-variant:   #333538
on-background:     #e2e2e6
on-surface:        #e2e2e6
on-surface-variant: #c5c9ac
inverse-surface:   #e2e2e6
inverse-on-surface: #2f3034
outline:           #8f9378
outline-variant:   #444932

### 4.2 Tipografía (Inter, 8 estilos)

display-hero:  48/52, -0.03em, 800
headline-lg:   32/38, -0.02em, 700
headline-md:   24/30, -0.015em, 700
headline-sm:   18/24, -0.01em, 600
body-lg:       16/24, 0em, 400
body-md:       14/20, 0em, 400
label-numeric: 18/22, 0.02em, 700
label-sm:      12/16, 0.04em, 600
caption:       11/14, 0.02em, 500

### 4.3 Espaciado

xs: 0.25rem   sm: 0.5rem   md: 1rem   lg: 1.5rem   xl: 2rem
gutter: 1rem  margin: 1rem

### 4.4 Radius

DEFAULT 0.25rem | lg 0.5rem | xl 0.75rem | full 9999px

### 4.5 Iconografía

Material Symbols Outlined (weights 400, 600). Usados por `name`, ej. `fitness_center`, `restaurant`, `insights`, `home`, `arrow_back`, `arrow_forward`, `add`, `check`, `more_horiz`, `show_chart`, `sticky_note_2`, `library_add`, `flag_circle`, `timer`, `hourglass_top`, `history`, `trending_up`, `monitor_weight`, `wb_twilight`, `sunny`, `coffee`, `nutrition`, `bolt`, `trophy`, `scale`.

## 5. Estructura de directorios

```
/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # ejercicios iniciales + admin user
├── public/
│   ├── icons/                       # PWA icons
│   ├── manifest.webmanifest
│   └── sw.js                        # service worker (own minimal impl)
├── src/
│   ├── app/
│   │   ├── layout.tsx               # root layout + safe-area
│   │   ├── page.tsx                 # home (auth-gated)
│   │   ├── login/page.tsx
│   │   ├── entreno/
│   │   │   ├── page.tsx             # lista de rutinas
│   │   │   ├── [routineId]/page.tsx # detalle rutina
│   │   │   └── active/page.tsx      # workout activo
│   │   ├── dieta/
│   │   │   ├── page.tsx             # hoy
│   │   │   ├── agregar/page.tsx     # food entry / NL parser
│   │   │   ├── guardados/page.tsx
│   │   │   └── objetivos/page.tsx
│   │   ├── progreso/
│   │   │   ├── page.tsx             # dashboard progreso
│   │   │   ├── peso/page.tsx        # body weight
│   │   │   ├── ejercicios/[id]/page.tsx
│   │   │   └── rutinas/[id]/page.tsx
│   │   ├── calendario/page.tsx
│   │   ├── biblioteca/page.tsx      # ejercicios
│   │   ├── settings/page.tsx        # backup, objetivos, logout
│   │   └── api/
│   │       └── health/route.ts
│   ├── components/
│   │   ├── ui/                      # Button, Card, Input, BottomNav, Sheet
│   │   ├── layout/                  # AppShell, BottomNav, Header
│   │   ├── workouts/                # ExerciseCard, SetRow, RestTimer
│   │   ├── nutrition/               # FoodEntryCard, MacroBar
│   │   ├── progress/                # ChartCard, WeeklyBars
│   │   └── primitives/              # Icon, MaterialSymbol
│   ├── lib/
│   │   ├── db.ts                    # Prisma singleton
│   │   ├── auth.ts                  # hashing, sesión
│   │   ├── session.ts               # cookies
│   │   ├── csrf.ts                  # CSRF tokens
│   │   ├── rate-limit.ts            # in-memory rate limit para /login
│   │   ├── validation/              # Zod schemas
│   │   ├── services/                # business logic
│   │   │   ├── workouts.ts
│   │   │   ├── routines.ts
│   │   │   ├── exercises.ts
│   │   │   ├── nutrition.ts
│   │   │   ├── bodyWeight.ts
│   │   │   ├── backup.ts
│   │   │   └── pr.ts                # PR detection
│   │   ├── parsers/
│   │   │   ├── types.ts             # interface NutritionParser
│   │   │   ├── manual.ts            # ManualNutritionParser (mock)
│   │   │   └── openai.ts            # OpenAINutritionParser (stub)
│   │   └── utils/
│   │       ├── format.ts            # kg, kcal, duration
│   │       ├── dates.ts
│   │       └── volume.ts            # cálculo puro
│   ├── actions/                     # server actions por módulo
│   │   ├── routines.ts
│   │   ├── workouts.ts
│   │   ├── exercises.ts
│   │   ├── nutrition.ts
│   │   ├── bodyWeight.ts
│   │   ├── settings.ts
│   │   └── auth.ts
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css              # tokens + Inter import
├── tests/
│   ├── unit/
│   │   ├── volume.test.ts
│   │   ├── pr.test.ts
│   │   ├── macros.test.ts
│   │   ├── body-weight.test.ts
│   │   └── backup.test.ts
│   └── e2e/
│       ├── workout-flow.spec.ts
│       └── nutrition-flow.spec.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .dockerignore
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── playwright.config.ts
├── vitest.config.ts
└── README.md
```

## 6. Modelo de datos (Prisma)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  routines      Routine[]
  workouts      Workout[]
  savedFoods    SavedFood[]
  savedMeals    SavedMeal[]
  foodEntries   FoodEntry[]
  bodyWeights   BodyWeightEntry[]
  settings      AppSetting?
  nutritionTarget DailyNutritionTarget?
}

model Exercise {
  id               String   @id @default(cuid())
  name             String
  muscleGroup      String
  secondaryMuscles String?
  equipment        String?
  notes            String?
  isCustom         Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  routineExercises RoutineExercise[]
  workoutExercises WorkoutExercise[]
  @@index([muscleGroup])
}

model Routine {
  id          String   @id @default(cuid())
  userId      String
  name        String
  description String?
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  exercises   RoutineExercise[]
  workouts    Workout[]
  @@index([userId])
}

model RoutineExercise {
  id          String   @id @default(cuid())
  routineId   String
  exerciseId  String
  position    Int
  targetSets  Int      @default(3)
  restSeconds Int      @default(90)
  notes       String?
  routine     Routine  @relation(fields: [routineId], references: [id], onDelete: Cascade)
  exercise    Exercise @relation(fields: [exerciseId], references: [id])
  @@index([routineId, position])
}

model Workout {
  id          String    @id @default(cuid())
  userId      String
  routineId   String?
  name        String
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  status      String    @default("ACTIVE") // ACTIVE | COMPLETED | ABANDONED
  notes       String?
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  routine     Routine?  @relation(fields: [routineId], references: [id])
  exercises   WorkoutExercise[]
  @@index([userId, status])
  @@index([startedAt])
}

model WorkoutExercise {
  id          String   @id @default(cuid())
  workoutId   String
  exerciseId  String
  position    Int
  orderIndex  Int      // mismo orden que en routine al inicio
  workout     Workout  @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exercise    Exercise @relation(fields: [exerciseId], references: [id])
  sets        WorkoutSet[]
  @@index([workoutId, position])
}

model WorkoutSet {
  id                String   @id @default(cuid())
  workoutExerciseId String
  setNumber         Int
  weight            Float?
  reps              Int?
  completed         Boolean  @default(false)
  completedAt       DateTime?
  isPersonalRecord  Boolean @default(false)
  prType            String?  // HEAVIEST | MAX_VOLUME | MAX_REPS
  restStartedAt     DateTime?
  restDuration      Int?     // seconds
  notes             String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  workoutExercise   WorkoutExercise @relation(fields: [workoutExerciseId], references: [id], onDelete: Cascade)
  @@index([workoutExerciseId, setNumber])
}

model FoodEntry {
  id                 String   @id @default(cuid())
  userId             String
  name               String
  quantity           Float
  unit               String   // g | ml | unidad | porción | cucharada | taza
  calories           Float
  protein            Float
  carbs              Float
  fat                Float
  mealType           String   // BREAKFAST | LUNCH | SNACK | DINNER | OTHER
  date               DateTime
  valuesAreEstimated Boolean @default(false)
  notes              String?
  createdAt          DateTime @default(now())
  user               User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, date])
}

model SavedFood {
  id          String   @id @default(cuid())
  userId      String
  name        String
  unit        String   @default("g")
  defaultQty  Float    @default(100)
  calories    Float
  protein     Float
  carbs       Float
  fat         Float
  notes       String?
  createdAt   DateTime @default(now())
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model SavedMeal {
  id        String   @id @default(cuid())
  userId    String
  name      String
  notes     String?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     SavedMealItem[]
}

model SavedMealItem {
  id           String    @id @default(cuid())
  savedMealId  String
  name         String
  quantity     Float
  unit         String
  calories     Float
  protein      Float
  carbs        Float
  fat          Float
  savedMeal    SavedMeal @relation(fields: [savedMealId], references: [id], onDelete: Cascade)
}

model DailyNutritionTarget {
  id        String   @id @default(cuid())
  userId    String   @unique
  calories  Float
  protein   Float
  carbs     Float
  fat       Float
  updatedAt DateTime @updatedAt
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model BodyWeightEntry {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  weightKg  Float
  notes     String?
  createdAt DateTime @default(now())
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, date])
}

model AppSetting {
  id        String   @id @default(cuid())
  userId    String   @unique
  units     String   @default("metric") // reserved
  theme     String   @default("dark")
  locale    String   @default("es")
  weeklyGoal Int     @default(4)
  updatedAt DateTime @updatedAt
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 7. Seguridad

- `AUTH_SECRET` (32+ chars random) firma la cookie de sesión y tokens CSRF.
- Bcrypt rounds = 12.
- Cookie sesión: `HttpOnly`, `Secure` cuando `NODE_ENV=production`, `SameSite=Lax`, `Path=/`, 30 días.
- CSRF: doble cookie. Token random en cookie `csrf_token` (no HttpOnly para que JS lo pueda leer) + header `x-csrf-token` validado en server actions.
- Rate limit login: 5 attempts / 15 min por IP. In-memory token bucket.
- Validación Zod en TODA server action / API route.
- `robots.txt` con `Disallow: /`. `<meta name="robots" content="noindex,nofollow">` en layout.
- No hay endpoint público de signup. Usuario creado por CLI.

## 8. Endpoints

Server actions por módulo. No API routes salvo `/api/health`. Los server actions validan CSRF + sesión + Zod.

## 9. UX flows críticos

### Workout activo
1. Home → "Empezar entrenamiento" → seleccionar rutina → server action `startWorkout(routineId)` crea Workout ACTIVE + copia los RoutineExercise como WorkoutExercise + sets target vacíos.
2. Pantalla `/entreno/active`. Header: nombre rutina + stopwatch (cliente, persistido en `startedAt`). Body: cards apiladas. Cada card: anterior (última sesión), lista de sets con inputs KG + reps, check button.
3. Tap check → optimistic toggle + `toggleSet(setId, completed)`. Si completado, abre rest timer (default = `restSeconds` de la RoutineExercise) → guarda `restStartedAt` + `restDuration` en el set. Cliente cuenta regresivo desde timestamp real.
4. Botón `+30s` / `Saltar`. Timer flotante minimizable (sticky top tras header).
5. `Finalizar Sesión` → modal resumen: duración, series, reps, volumen, PRs detectados → `completeWorkout(workoutId)`.

### Dieta
1. `/dieta` muestra macros del día actual con progress bars + lista de tomas.
2. `+ Agregar` → bottom sheet con: nombre, qty, unit, kcal, P, C, F, mealType. Botón "Describir comida" abre modo NL.
3. Modo NL: textarea + botón "Estimar" → llama `parseNutrition(text)` → muestra preview editable con label "Valores aproximados" antes de confirmar.
4. Confirmar crea FoodEntry con `valuesAreEstimated: true`.

### Body weight
1. `/progreso/peso` lista entradas + chart.
2. Botón `+` → input fecha (default hoy) + peso (kg). Crear BodyWeightEntry.

## 10. PWA

- `manifest.webmanifest`: name=RepFuel, short_name=RepFuel, display=standalone, orientation=portrait, theme_color=#caf300, background_color=#111317.
- Icons: 192, 512, maskable 512.
- Service worker (`/sw.js`): pre-cachea shell estático (Next.js _next/static + manifest + fonts). Network-first para navegación, cache-first para assets. NO cachea `/api`, NO cachea páginas autenticadas.
- `apple-mobile-web-app-capable=yes` en meta. Apple touch icon 180×180.

## 11. Performance

- Server Components por defecto. Client solo donde hay estado (timer, inputs).
- Recharts lazy via dynamic import en `progreso/` y detalle ejercicio.
- Paginación de historial: 20 workouts por página.
- DB indices en FK + `startedAt`, `date`.

## 12. Variables de entorno

```
DATABASE_URL=file:./data/repfuel.db
AUTH_SECRET=                       # openssl rand -base64 32
ADMIN_EMAIL=
ADMIN_PASSWORD=                    # solo usado en seed inicial
NUTRITION_AI_PROVIDER=             # none | openai
NUTRITION_AI_API_KEY=              # opcional
NUTRITION_AI_MODEL=                # default gpt-4o-mini
APP_URL=http://localhost:3000      # para OG / canonical
```

## 13. Docker

- Multi-stage: deps → builder → runner.
- `runner` corre `node server.js` (next start).
- Volumen `rep-fuel-data` montado en `/app/data` (DB + uploads + backups).
- `docker compose up -d` levanta single container.
- Healthcheck via `wget /api/health`.

## 14. Definition of Done

La aplicación está completa cuando el usuario puede completar los flujos listados en el prompt principal (43 puntos) sin encontrar botones sin implementar, errores en consola ni rutas rotas; lint + typecheck + tests + build pasan; diseño coincide con Stitch; PWA instala; Docker funciona.

## 15. Fuera de alcance

redes sociales, seguidores, pagos, ads, tracking publicitario, marketplace, public API, accounts públicas.