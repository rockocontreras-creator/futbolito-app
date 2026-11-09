# ⚽ Futbolito App

Plataforma web (mobile-first, instalable como PWA) para organizar partidos de futbolito en Chile,
partiendo por **San Clemente, Región del Maule**: revoltijos, desafíos entre equipos, ligas y un rango tipo Elo
para jugadores y equipos.

- Contexto completo del producto y reglas: [`CLAUDE.md`](./CLAUDE.md)
- Plan por fases: [`docs/ROADMAP.md`](./docs/ROADMAP.md)
- Decisiones técnicas: [`docs/DECISIONES.md`](./docs/DECISIONES.md)

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind 4 + shadcn/ui · PostgreSQL (Supabase) · Prisma 7 ·
Auth.js v5 · Zod · Vitest · Playwright · Vercel · pnpm

## Puesta en marcha

Requisitos: **Node 22+** y **pnpm** (`corepack enable` lo deja listo).

```bash
git clone <url-del-repo>
cd futbolito-app
pnpm install            # también genera el cliente de Prisma
cp .env.example .env    # y completa los valores (ver abajo)
pnpm db:migrate         # crea/aplica las tablas
pnpm db:seed            # Región del Maule + San Clemente
pnpm dev                # http://localhost:3000
```

### Variables de entorno

| Variable                               | De dónde sale                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`           | Supabase → Project Settings → Database → Connection string (pooler y directa)                           |
| `AUTH_SECRET`                          | `pnpm dlx auth secret`                                                                                  |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google Cloud Console → Credenciales → OAuth. Redirect: `http://localhost:3000/api/auth/callback/google` |
| `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`   | [resend.com](https://resend.com) (enlace mágico por email)                                              |
| `NEXT_PUBLIC_SUPABASE_*`               | Supabase → Project Settings → API (fotos y escudos)                                                     |

Nunca commitear `.env`. Si agregas una variable, documéntala en `.env.example`.

## Scripts

| Comando                     | Qué hace                                                                      |
| --------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                  | Servidor de desarrollo                                                        |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                                             |
| `pnpm typecheck`            | TypeScript sin emitir                                                         |
| `pnpm test`                 | Tests unitarios (Vitest)                                                      |
| `pnpm test:e2e`             | Tests end-to-end (Playwright; la primera vez: `pnpm exec playwright install`) |
| `pnpm db:migrate`           | Crea una migración a partir de `prisma/schema.prisma` y la aplica             |
| `pnpm db:seed`              | Datos iniciales                                                               |
| `pnpm db:studio`            | Explorador visual de la BD                                                    |

## Cómo trabajamos (dos personas)

1. Nunca directo en `main`. Rama por funcionalidad: `git switch -c feature/inscripcion-revoltijos`.
2. Commits chicos con [Conventional Commits](https://www.conventionalcommits.org/es/) en español:
   `feat: inscripción a revoltijos`, `fix: cálculo de cupos`, `docs: …`.
3. Antes de subir: `pnpm lint && pnpm typecheck && pnpm test` (el hook de pre-commit formatea solo).
4. Push y **Pull Request** hacia `main`. El otro revisa; CI tiene que estar en verde. Vercel deja un preview.
5. Si cambias el esquema: `pnpm db:migrate --name descripcion-corta` y commitea la carpeta `prisma/migrations/`.
6. Si cambia una regla del producto, actualiza `CLAUDE.md` y anótalo en `docs/DECISIONES.md`.

Para quien no haya usado ramas: `git pull` en `main` antes de empezar, `git switch -c feature/...`, trabajas,
`git push -u origin feature/...`, y abres el PR desde GitHub.

## Estructura

```
src/
  app/                 # rutas (App Router)
  components/ui/       # componentes shadcn
  components/features/ # componentes por dominio (match, team, player, league)
  server/              # actions, queries, services, permisos
  lib/rating/          # Elo, divisiones, armar equipos (puro + tests)
  lib/validations/     # esquemas Zod
  config/site.ts       # APP_NAME y constantes
prisma/                # schema.prisma, seed.ts, migrations/
tests/e2e/             # Playwright
```
