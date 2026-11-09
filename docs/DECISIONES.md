# Registro de decisiones

Cada decisión técnica o de producto que se aparte de CLAUDE.md, o que agregue una librería, se anota aquí
(la más reciente arriba).

## 2026-11-09 · Login con correo/usuario y contraseña

**Entrar con contraseña, siempre disponible.** Proveedor `Credentials` de Auth.js (id `password`). Se entra
con el correo o con el nombre de usuario del perfil (con o sin "@"). Crear cuenta en `/registro` pide nombre,
correo y contraseña (mínimo 8), y lleva directo a crear el perfil de jugador. Google y el enlace por correo
siguen apareciendo solo si sus claves están configuradas.

**Contraseñas con `scrypt` de Node** (`src/lib/password.ts`), sin librerías nuevas. Se guarda
`scrypt$N$r$p$sal$hash` en `User.passwordHash`, con sal aleatoria y comparación en tiempo constante. Si el
usuario no existe igual se compara contra un hash de relleno, para no revelar qué correos están registrados.

**Sesiones JWT en vez de sesiones en base de datos.** Auth.js exige JWT para el login con contraseña. El
adaptador de Prisma sigue guardando usuarios y cuentas de Google. Duración: 30 días.

**Sin vínculo automático Google ↔ contraseña.** Si un correo ya tiene contraseña y alguien entra con Google con
ese correo, Auth.js lo rechaza (`OAuthAccountNotLinked`) y la app explica que entre con su contraseña. Vincular
automáticamente permitiría que quien registró un correo ajeno se quede con la cuenta.

**Pendiente:** verificar el correo de las cuentas con contraseña, "olvidé mi contraseña" (necesita Resend) y
limitar intentos de login por IP.

## 2026-11-09 · Rediseño y primeras funciones

**Identidad "cancha de noche".** Verde pasto profundo (`--cancha`), verde vivo para acciones (`--pasto`),
blanco cal de fondo (`--cal`), amarillo foco para destacar (`--foco`) y rojo tarjeta para errores. Las
superficies verdes llevan las líneas de cal dibujadas en CSS (`chalk-pitch`). Los cupos se muestran como una
barra de casillas que se llenan.

**Tipografía Archivo (variable, con eje de ancho)** vía `@fontsource-variable/archivo`, en lugar de Geist.
Una sola familia: condensada y gruesa para títulos (aire de marcador), normal para el texto. Se sirve desde el
propio sitio, sin depender de Google Fonts en el build.

**Login solo con proveedores configurados.** Google y Resend se activan únicamente si sus claves existen;
así la app no muestra "Server error / Configuration" mientras falten. Sin claves, /ingresar lo explica.

**Canchas nuevas desde el formulario de publicar.** Si la cancha no está en la lista, se propone ahí mismo:
queda `PENDING` para el admin, pero quien la propuso puede usarla de inmediato.

**Equipos sin imagen de escudo por ahora.** El escudo se dibuja con los dos colores y las iniciales del equipo.
Unirse es por solicitud que acepta un capitán; el último capitán no puede salir dejando jugadores sin capitán.

**Datos de prueba** en `prisma/seed-demo.ts` (`pnpm db:seed:demo`), solo para bases locales: se niega a
correr contra Supabase/Neon salvo que se fuerce con `ALLOW_DEMO_ON_REMOTE=1`.

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
