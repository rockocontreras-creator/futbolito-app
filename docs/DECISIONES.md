# Registro de decisiones

Cada decisión técnica o de producto que se aparte de CLAUDE.md, o que agregue una librería, se anota aquí
(la más reciente arriba).

## 2026-11-09 · Comunidad, gestión de partidos, ranking, mapa y "se busca"

**Mapa con Leaflet + OpenStreetMap, no Google Maps.** Google Maps embebido exige una clave con tarjeta de
crédito. OSM es gratis y sin clave; para llegar, el botón "Cómo llegar" abre Google Maps con la ruta. Si algún
día crece el tráfico, cambiar el proveedor de mosaicos (la política de uso de OSM pide no abusar).

**Apodos por reglas, sin IA externa.** Gratis, inmediatos y predecibles. Si más adelante se quiere IA, se puede
agregar encima usando los mismos datos (etiquetas + comentarios).

**Reporte de resultados incluido.** Sin resultados no hay Elo, ranking ni apodos por estadísticas. El cierre es
"perezoso" (sin cron): se ejecuta al abrir el partido, un perfil o la clasificación.

**Nivelación por promedio.** El ajuste fino del armado de equipos ahora iguala promedios (antes sumas). Con
cantidad impar (5 vs 4) igualar sumas dejaba al lado chico mucho más fuerte.

**Expulsados.** Nuevo estado `KICKED` en `ParticipantStatus`: el jugador no puede volver a inscribirse.

**Fotos en Supabase Storage** con la `SUPABASE_SERVICE_ROLE_KEY` (solo servidor). El bucket `avatars` se crea
solo la primera vez. Se valida el tipo real por los primeros bytes; límite de Server Actions subido a 3 MB.

**Pendiente:** panel admin para resolver resultados en disputa y aprobar canchas; notificaciones.

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

## 2026-11-10 · Sala, colores, clima, mayoría y etiquetas

**Resultado por mayoría.** Reemplaza "se confirma si nadie objeta en 24 h". Ahora cuenta cuando confirma la
mayoría absoluta de los que jugaron (el organizador cuenta). Sin mayoría queda pendiente: preferimos un
resultado sin confirmar a uno que nadie aprobó. Si la mitad o más lo rechaza, pasa a disputa.

**Clima con Open-Meteo.** Gratis, sin API key ni registro. Uso no comercial gratis; si la app empieza a
cobrar hay que pasar a su plan pagado o cambiar de proveedor. El pronóstico se guarda en caché una hora
(`"use cache"`), así que no se llama por cada visita. Si falla, simplemente no se muestra.

**Chat con sondeo (polling) cada 4 s** en vez de websockets o Supabase Realtime: funciona en Vercel sin
servicios extra ni políticas RLS nuevas. Si crece el uso, migrar a Supabase Realtime.

**Edad mínima 14 años y cuidado con menores.** La fecha de nacimiento pasa a ser obligatoria al crear o
editar el perfil. A menores de 18 no se les muestra la edad exacta ni el teléfono/WhatsApp. "Joven promesa"
es para menores de 18 (no 15, para que coincida con esa regla).

**Etiquetas y colores sin tabla nueva.** Las etiquetas del perfil se calculan (como los apodos). Los colores
del revoltijo son dos columnas en `Match` con valores de una paleta fija validada con Zod.

## 2026-11-12 · Google, confirmar el correo y diseño

**Código por correo en vez de solo revisar el dominio.** Revisar el DNS frena dominios inventados
(`asdf@adjkdjas.com`) pero no direcciones inventadas en dominios reales (`asdf123@gmail.com`). Solo un
código que llega al correo prueba que existe y es de quien se registra. Igual se revisa el dominio antes,
para no gastar envíos. Si el DNS del servidor no responde (ni siquiera gmail.com), no se bloquea a nadie.

**Nodemailer + Gmail (contraseña de aplicación)** para enviar los códigos: gratis, sin dominio propio y
~500 correos al día. Resend exige un dominio propio para mandar a cualquier persona. Si algún día hay
dominio, basta con cambiar `EMAIL_SERVER_HOST`/`PORT`/`USER`/`PASSWORD`.

**Cuentas existentes quedan confirmadas** (migración `verificacion_correo`), para que nadie quede afuera.

**Google se vincula por correo** (`allowDangerousEmailAccountLinking`): Google verifica el correo, y así
la cuenta admin creada a mano y las cuentas con contraseña pueden entrar también con Google.

**Admin por variable `ADMIN_EMAILS`** además del rol en la base: si se borra o recrea la cuenta, sigue
siendo admin al volver a entrar.

**Diseño:** el carrusel pasa a la portada en lugar de la tarjeta "El próximo partido" (mostraban lo mismo).
Se quitan las etiquetas chicas sobre los títulos; los títulos del carrusel son frases completas. El
plantel deja de tener cajas dentro de cajas. El perfil muestra el récord con una barra G/E/P.

## 2026-11-13 · Club de la Pichanga: nombre, rediseño, carta de jugador

**Nombre nuevo: Club de la Pichanga.** Se cambia `APP_NAME`; el repo, el paquete y el proyecto de Vercel siguen
llamándose `futbolito-app` (renombrarlos cambiaría la dirección de la página y habría que rehacer la
configuración de Google).

**Rediseño amigable.** El equipo pidió un estilo "parecido a Duolingo". Tomamos la idea (letra redonda, botones
con relieve, colores vivos, mascota propia) sin copiar su marca. El verde principal es `#15803c` y no uno más
claro porque el texto blanco encima tiene que cumplir contraste AA (4,5:1).

**Librería nueva: `@fontsource-variable/nunito`** (reemplaza a `@fontsource-variable/archivo`). Nunito es
redondeada, de uso libre y se sirve desde nuestro propio dominio.

**Carta de jugador calculada, no guardada.** Igual que los apodos y las etiquetas: funciones puras sobre las
estadísticas que ya existen. Los atributos usan un "valor de partida" que pesa menos mientras más partidos
tiene el jugador, para que un 1 de 1 no sea un 99. El diseño de la carta es propio (no usa nombres, logos ni
la silueta de las cartas de videojuegos).

**La foto se elige al crear el perfil** y se sube justo después de crearlo. Si la subida falla, el perfil
queda creado igual y se avisa.

## 2026-11-13 · Panel de administración

**Sin tablas nuevas.** El panel usa lo que ya existía (`Venue.status`, `Match.status`, `User.role`,
`User.suspendedAt`, `Sector`). Los reportes de usuarios quedan para después: el modelo `Report` existe pero
todavía no hay botón para reportar.

**Resolver un resultado reutiliza el cierre normal** (`forceConfirmResult` en `finalize-results.ts`): mismo
Elo, estadísticas e historial que cuando confirma la mayoría, solo que se salta la votación.

**Acciones que no se deshacen piden dos toques** (anular, rechazar, suspender) en vez de una ventana de
confirmación del navegador.
