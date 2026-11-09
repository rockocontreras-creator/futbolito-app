# Registro de decisiones

Cada decisión técnica o de producto que se aparte de CLAUDE.md, o que agregue una librería, se anota aquí
(la más reciente arriba).

## 2026-11-08 · Base del repositorio

**Versiones instaladas** (últimas estables a la fecha): Next.js 16.4, React 19.3, TypeScript 5.9, Tailwind 4.3,
Prisma 7.10, Zod 4.6, Vitest 5.1, Playwright 1.65.

**Auth.js en `next-auth@5` (beta).** La v4 es la "estable" en npm, pero está pensada para el Pages Router.
La v5 es la que documenta Auth.js para App Router + Server Actions y la que usa todo el ecosistema hoy.
Revisar si sale una v5 estable.

**Enlace mágico con el proveedor Resend de Auth.js.** No agrega dependencias (usa `fetch`), tiene plan gratis
y es el camino más corto. Si se prefiere SMTP, se cambia por el proveedor Nodemailer.

**Prisma 7.** El cliente se genera en `src/generated/prisma` (no se commitea; `postinstall` lo regenera) y se
conecta vía `@prisma/adapter-pg` + `pg`, que es el modo obligatorio en Prisma 7. La URL de migraciones vive
en `prisma.config.ts` (`DIRECT_URL`); la app usa `DATABASE_URL` (con pooler).

**`PlayerRating` → `PeerReview`.** La valoración 1–5 entre compañeros se llama `PeerReview` para no
confundirla con el rango Elo (`rating`). Actualizado en CLAUDE.md §7.

**Rango guardado en el perfil/equipo.** `PlayerProfile.rating` / `Team.rating` + `ratedMatches` (para el K).
Estadísticas denormalizadas en las mismas tablas; se recalculan al confirmar resultados.

**Armar equipos = snake draft + ajuste fino.** Tras el snake draft (arqueros primero), se intercambian pares
de jugadores de campo mientras eso acerque las sumas de rating. Determinista y el organizador puede ajustar.

**Elo en desafíos/liga:** el lado de cada jugador se mide con el **rating del equipo** (no el promedio de los
jugadores), con K a la mitad. Los cambios se redondean al entero más cercano por persona/equipo.

**Disponibilidad semanal** como tabla `Availability` (día + minuto inicio/fin) en vez de JSON, para poder
filtrar "quién juega el sábado en la tarde".

**Librerías agregadas fuera de la tabla de CLAUDE.md** (todas parte estándar de shadcn/ui o de la
integración ya decidida): `clsx`, `tailwind-merge`, `class-variance-authority`, `radix-ui`, `tw-animate-css`
(shadcn), `next-themes` (modo claro/oscuro), `geist` (fuente, sin descarga desde Google en el build),
`@date-fns/tz` (zona horaria con date-fns v4), `server-only`, `@prisma/adapter-pg` + `pg` (Prisma 7),
`@auth/prisma-adapter`, `tsx` + `dotenv` (seed), `prettier-plugin-tailwindcss`, `eslint-config-prettier`.

**Componentes shadcn escritos a mano** (Button, Card, Badge) porque el registro no estaba accesible al
crear el repo. Son el código estándar; los siguientes se agregan normal con `pnpm dlx shadcn@latest add …`.

**Migración inicial creada** (`20261109035808_init`), generada por el motor de Prisma a partir de
`schema.prisma` y probada en un Postgres local (migración + seed). En Supabase se aplicó vía SQL Editor
junto con el registro en `_prisma_migrations`, así que `pnpm db:migrate` y `pnpm db:deploy` la reconocen
como aplicada.

**RLS activado en todas las tablas de Supabase.** La app no usa la API REST de Supabase para datos:
entra con Prisma como el rol `postgres` (dueño de las tablas, que no queda sujeto a RLS). Activar RLS
sin políticas bloquea el acceso a las tablas con las llaves `anon`/`authenticated`, que quedan públicas
en el navegador. Si algún día se usa Supabase Realtime o la API REST, hay que crear políticas.
