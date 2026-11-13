# CLAUDE.md — Contexto maestro del proyecto

> Este archivo es el **prompt maestro** del proyecto. Cualquier asistente de IA (Claude Code u otro)
> debe leerlo completo antes de escribir código. Cuando se agreguen requisitos nuevos, se actualiza
> aquí (y se registra el cambio en `docs/DECISIONES.md`).

---

## 1. Qué estamos construyendo

Una plataforma web (mobile-first, instalable como PWA) para **organizar partidos de futbolito**
en Chile, partiendo por la **comuna de San Clemente (Región del Maule)**, que hoy no tiene ninguna
herramienta para esto.

Nombre: **Club de la Pichanga** (antes "Futbolito App"). El nombre vive en una sola constante,
`APP_NAME` en `src/config/site.ts` (y `APP_SHORT_NAME` para el ícono de la app instalada). El repo y el
proyecto de Vercel conservan el nombre `futbolito-app`.

### Problemas que resuelve

1. **"No tengo con quién jugar"** → el jugador busca o publica un **revoltijo** (partido abierto
   donde jugadores sueltos se inscriben y los equipos se arman en el momento).
2. **"Tenemos equipo pero no rival"** → el equipo publica un **desafío** ("buscamos rival") y otro
   equipo lo acepta.
3. **"Queremos competir en serio"** → **ligas** con temporadas, fixture y tabla de posiciones.
4. **"¿Qué tan buenos somos?"** → **rango** (rating) para jugadores y equipos, basado en
   resultados confirmados.

### Usuarios

- **Jugador**: tiene perfil, rango, estadísticas; se inscribe en revoltijos, pertenece a equipos.
- **Capitán**: jugador que administra un equipo (plantel, desafíos, confirmar resultados).
- **Organizador de liga**: crea ligas, temporadas, fixture, valida resultados.
- **Administrador**: modera contenido, gestiona zonas y canchas, resuelve disputas.

---

## 2. Stack tecnológico (decidido)

Elegido por ser el estándar profesional actual para apps web full-stack, tener un solo lenguaje
de punta a punta (TypeScript), hosting gratuito para empezar y excelente soporte de IA.

| Capa                      | Tecnología                                                      |
| ------------------------- | --------------------------------------------------------------- |
| Lenguaje                  | **TypeScript** (modo `strict`)                                  |
| Framework                 | **Next.js** (App Router, Server Components, Server Actions)     |
| UI                        | **Tailwind CSS** + **shadcn/ui** + iconos **lucide-react**      |
| Base de datos             | **PostgreSQL** (hosting en **Supabase** o Neon, plan gratuito)  |
| ORM / migraciones         | **Prisma**                                                      |
| Autenticación             | **Auth.js (NextAuth)** con Google + correo/usuario y contraseña |
| Correos salientes         | **Nodemailer** por SMTP (Gmail con contraseña de aplicación)    |
| Validación                | **Zod** (compartido entre formularios y servidor)               |
| Formularios               | **react-hook-form** + `@hookform/resolvers/zod`                 |
| Imágenes (fotos, escudos) | **Supabase Storage**                                            |
| Mapas                     | **Leaflet** + OpenStreetMap (gratis, sin API key)               |
| Fechas                    | **date-fns** con locale `es` y zona horaria `America/Santiago`  |
| Tests                     | **Vitest** (unitarios) + **Playwright** (end-to-end)            |
| Calidad                   | ESLint + Prettier + Husky/lint-staged                           |
| CI                        | GitHub Actions (lint, typecheck, tests en cada PR)              |
| Deploy                    | **Vercel** (preview automático por cada PR)                     |
| Gestor de paquetes        | **pnpm**                                                        |

Usar siempre las **últimas versiones estables** al momento de instalar. No agregar librerías nuevas
sin justificarlo en `docs/DECISIONES.md`.

---

## 3. Idioma y localización

- Toda la **interfaz en español de Chile**, con lenguaje cercano ("¿Te sumas?", "Buscar pichanga",
  "Faltan 3 para el revoltijo").
- **Código en inglés** (nombres de variables, funciones, tablas). Comentarios pueden ir en español.
- Fechas en formato chileno (`dom 8 nov · 20:00`), zona horaria `America/Santiago` siempre.
- Moneda CLP si algún día se cobra (ej. arriendo de cancha dividido entre jugadores).
- Teléfonos en formato `+56 9 XXXX XXXX`.

---

## 4. Zonas (multi-zona desde el día 1)

Aunque partimos solo en San Clemente, el modelo debe permitir crecer a otras comunas sin rehacer nada.

- Jerarquía: `Region → Comuna → Sector`.
- Cada comuna tiene un flag `isActive`. Al inicio solo **San Clemente** está activa.
- Los sectores (villas, poblaciones, localidades rurales) son administrables desde el panel admin;
  no inventar sectores en el seed, dejar solo la comuna y que el admin los cargue.
- Todo partido, cancha, equipo y jugador tiene una zona asociada. Las búsquedas filtran por zona
  (por defecto, la del usuario).

---

## 5. Funcionalidades

### 5.0 Cuentas

- Se entra con **Google** (primera opción en pantalla) o con **correo/usuario + contraseña**.
- Crear cuenta con contraseña exige **confirmar el correo** con un código de 6 dígitos (vence en 15 min,
  5 intentos, reenvío cada 60 s y máximo 5 por hora). Antes de mandarlo se rechazan dominios que no existen
  (DNS: MX o A) y correos desechables; se sugiere el dominio correcto ante errores de tipeo ("gmial.com").
- Sin confirmar no se puede entrar: al intentarlo se manda un código nuevo.
- Google puede entrar a una cuenta existente con el mismo correo (Google verifica el correo). Si esa cuenta
  tenía una contraseña sin confirmar, la contraseña se borra.
- Los correos en la variable `ADMIN_EMAILS` quedan como admin al entrar.
- Páginas `/privacidad` y `/terminos` (Google las exige para publicar el ingreso con Google). Si cambia qué
  datos se guardan o quién los ve, hay que actualizar `/privacidad`.

### 5.1 Perfil de jugador

- Nombre, apodo, foto, fecha de nacimiento (**obligatoria; edad mínima 14 años**; solo se muestra la edad),
  género opcional, sector, teléfono (privado; visible solo para compañeros de partido confirmados).
- **Menores de 18**: no se muestra su edad exacta ni su teléfono/WhatsApp a nadie (tampoco en "Se busca").
- Posición preferida: `ARQUERO`, `DEFENSA`, `MEDIO`, `DELANTERO` o `COMODÍN` (`FLEX`, cualquier posición)
  (+ secundaria opcional).
- **Etiquetas del perfil** (`src/lib/profile-badges.ts`, se calculan, no se guardan): "Jugadora" (género
  femenino), "Viejo crack" (mayor de 35), "Joven promesa" (menor de 18), "Comodín".
- Se puede editar el perfil en `/perfil/editar` (el rango no se toca ahí).
- Pie hábil, nivel autodeclarado inicial (Principiante / Intermedio / Avanzado) que define el
  rating inicial.
- Disponibilidad semanal (días y franjas horarias).
- **Rango** (ver sección 6), estadísticas: partidos jugados, ganados/empatados/perdidos, goles,
  MVPs, % de asistencia.
- **Fair play / reputación**: asistencia vs. inscripciones (no-shows bajan la reputación),
  valoraciones de compañeros tras el partido (1–5, anónimas).
- Historial de partidos y equipos.
- **Foto de perfil** en Supabase Storage (bucket público `avatars`); el navegador la recorta a 512 px. Se elige
  al crear el perfil (se sube apenas se crea) y se cambia en el perfil o en `/perfil/editar`. Si la cuenta
  viene de Google, el perfil parte con esa foto.
- **Carta de jugador** (`src/lib/player-card.ts`, funciones puras; no se guarda nada): número general que sale
  del rango (1000 → 65, +6 cada 100 puntos, entre 40 y 99) y seis atributos de 40 a 99: `GOL` goles por
  partido, `VIC` victorias, `MVP` veces figura, `ASI` asistencia, `VAL` valoración de compañeros, `EXP`
  partidos jugados. Con pocos partidos parten de un valor neutro. El color de la carta es el de la división.
  Se ve en el perfil y se comparte por WhatsApp.
- El apodo ("¿Cómo te dicen en la cancha?") se pregunta **una sola vez**, en el perfil; en el registro solo se
  pide nombre y apellido.
- **Comentarios en el perfil** (máx. 280 caracteres). Los borra su autor, el dueño del perfil o un admin.
- **Apodos de la cancha** automáticos (ej. "La Abeja", "El Alérgico al Gol"): reglas puras en
  `src/lib/nicknames.ts` a partir de estadísticas, etiquetas de las valoraciones y palabras de los comentarios.
  No se guardan; se recalculan.
- URL pública: `/jugador/[username]`.

### 5.2 Equipos

- Nombre, escudo, colores, sector, descripción, fecha de fundación.
- Roles: `CAPITAN` (1 o más), `JUGADOR`.
- Invitaciones (por link compartible o búsqueda de jugadores) y solicitudes para unirse.
- Rango de equipo, estadísticas, historial de partidos, racha actual.
- URL pública: `/equipo/[slug]`.

### 5.3 Partidos — 3 tipos

**a) Revoltijo (`PICKUP`)**

- Cualquier jugador lo publica: cancha, fecha/hora, formato (5v5, 6v6, 7v7…), cupos totales,
  rango mínimo/máximo opcional, costo por persona opcional, notas.
- Otros jugadores se inscriben hasta llenar cupos; luego hay **lista de espera**.
- Al cerrar inscripciones, el organizador pulsa **"Armar equipos"**: el sistema balancea los
  equipos por rating (algoritmo tipo _snake draft_, repartiendo arqueros primero). El organizador
  puede ajustar manualmente.
- El organizador elige el **color de cada equipo** (2 colores distintos de una paleta fija,
  `src/lib/colors.ts`); se usan en el armado, el marcador y el reporte.
- **Sala del partido**: chat para inscritos y organizador (no expulsados ni retirados). Se actualiza cada 4 s
  mientras la pestaña está visible. Cada mensaje lo borra su autor, el organizador o un admin.
- **Clima**: pronóstico de Open-Meteo para la hora y ubicación de la cancha (hasta 15 días antes). Si hay
  mal clima se muestra un aviso en el partido, un ícono en la tarjeta y una notificación en la campana a los
  inscritos (48 h antes, una vez por tipo de alerta).
- Botón **"Compartir por WhatsApp"** con texto prearmado y link (clave en Chile).
- El organizador gestiona el plantel: expulsar (`KICKED`, no puede volver a inscribirse), mover entre equipo
  A/B/sin equipo, subir o bajar de la lista de espera. La nivelación compara **promedios** de rango por lado.

**b) Desafío / amistoso entre equipos (`CHALLENGE`)**

- Un capitán publica "Buscamos rival": fecha/hora (o rango de fechas), cancha propuesta o
  "a coordinar", rango de rivales deseado.
- Otro capitán lo acepta o hace contrapropuesta. Se confirma cuando ambos están de acuerdo.
- También se puede desafiar directamente a un equipo desde su perfil.

**c) Partido de liga (`LEAGUE`)**

- Generado desde el fixture de una liga. Mismas reglas de resultado, pero lo valida el organizador.

**Estados del partido:** `OPEN` → `FULL` / `CONFIRMED` → `PLAYED` → `RESULT_CONFIRMED`
(o `DISPUTED`, `CANCELLED`).

### 5.4 Resultados

- Tras el partido, cada lado reporta marcador (y opcionalmente goleadores y MVP).
- Si ambos coinciden → `RESULT_CONFIRMED` y se actualiza el rango.
- Si no coinciden → `DISPUTED` → lo resuelve el organizador (liga) o un admin.
- Si un lado no reporta en 48 h, se confirma automáticamente lo reportado por el otro.
- En revoltijos: reporta el organizador (su reporte cuenta como 1 confirmación) y a los que jugaron les llega
  un aviso para **confirmar o rechazar**. Se confirma cuando lo aprueba la **mayoría absoluta** de los que
  jugaron (`floor(n/2)+1`). Si la mitad o más lo rechaza → `DISPUTED` (lo resuelve un admin o el organizador
  corrige el reporte, que reinicia la votación). Si no se llega a mayoría, **queda pendiente** (sin plazo).
  Hay que tener los equipos armados (lado A/B) para reportar.
- Después del partido, quienes jugaron se valoran entre sí (1–5 estrellas + hasta 3 etiquetas `PlayerTag`)
  durante 7 días. Es anónimo para el valorado.

### 5.5 Ligas

- Creadas por usuarios con rol organizador (aprobados por admin).
- Temporadas, equipos inscritos, generación automática de fixture (todos contra todos, ida y/o
  vuelta), tabla de posiciones (PJ, PG, PE, PP, GF, GC, DG, Pts), tabla de goleadores.
- Reglamento en texto libre.

### 5.6 Canchas

- Mapa con Leaflet + OpenStreetMap (`/canchas`) y botón "Cómo llegar" que abre Google Maps. Al proponer
  una cancha se marca en el mapa (o con la ubicación del teléfono).
- Listado de canchas de la zona: nombre, dirección, ubicación en mapa, tipo de superficie
  (pasto sintético, natural, tierra), techada sí/no, iluminación, contacto, precio referencial.
- Las propone cualquier usuario; las aprueba un admin.

### 5.6b Se busca jugadores

- `/se-busca`: un jugador publica "faltan N" (opcionalmente posiciones y rango) para una fecha/cancha.
- Otros se ofrecen; el autor acepta o rechaza. Al aceptar, cada uno ve el WhatsApp del otro (si lo tiene en el
  perfil). Al completar los cupos se cierra sola. Máximo 5 búsquedas abiertas por persona.

### 5.6c Clasificación y torneos

- `/ranking`: jugadores (filtro por posición) y equipos, ordenados por rating.
- `/torneos`: "Próximamente".

### 5.7 Búsqueda (pantalla principal)

- **Carrusel de noticias** de la comuna en la portada (junto al título) (`src/server/queries/news.ts`): próximo
  enfrentamiento, próximo revoltijo, máximo goleador, N°1 del ranking, último resultado, búsquedas abiertas,
  equipo nuevo. Solo aparecen las que tienen datos.
- Feed "Partidos cerca de ti" con filtros: tipo, fecha, sector, formato, cupos disponibles, rango.
- Vista lista y vista mapa.
- Buscador de jugadores y equipos (para invitar o desafiar).

### 5.8 Notificaciones

- En la app (campana) y por email. Push web (PWA) en una fase posterior.
- Eventos: invitación a equipo, alguien se sumó a tu revoltijo, revoltijo lleno, desafío
  aceptado, recordatorio 2 h antes, reportar resultado, cambio de rango.
- Hechas: confirmar resultado (`CONFIRM_RESULT`) y alerta de clima (`WEATHER_ALERT`). `Notification.key`
  evita duplicados. La página es `/notificaciones`.

### 5.9 Moderación

- Reportar usuario/equipo/partido. Panel admin para revisar reportes, suspender cuentas,
  aprobar canchas, organizadores y gestionar zonas.

---

## 6. Sistema de rango

Basado en **Elo**, simple de explicar y robusto.

- Rating inicial jugador según nivel autodeclarado: Principiante 900, Intermedio 1000, Avanzado 1100.
- Rating inicial equipo: 1000.
- Resultado esperado: `E = 1 / (1 + 10^((Rb - Ra) / 400))`.
- Actualización: `R' = R + K · M · (S - E)`, donde `S` = 1 / 0.5 / 0 (gana/empata/pierde),
  `K` = 40 en los primeros 10 partidos y 20 después, y `M` = multiplicador por diferencia de
  goles (1 si dif ≤ 1, 1.5 si dif = 2, `(11 + dif) / 8` si dif ≥ 3).
- **Revoltijo**: el rating de cada lado es el promedio de sus jugadores; cada jugador recibe el
  cambio de su lado (solo afecta ratings individuales).
- **Desafío / liga**: se actualiza el rating del equipo **y** el de cada jugador que participó
  (los jugadores con K reducido a la mitad).
- Solo cambian ratings los partidos `RESULT_CONFIRMED`.
- Divisiones visibles:

| División | Rating      |
| -------- | ----------- |
| Bronce   | < 900       |
| Plata    | 900 – 1099  |
| Oro      | 1100 – 1299 |
| Platino  | 1300 – 1499 |
| Diamante | ≥ 1500      |

- Guardar cada cambio en `RatingHistory` para graficar la evolución en el perfil.
- La lógica de rating vive en `src/lib/rating/` como funciones **puras** con tests unitarios.

---

## 7. Modelo de datos (borrador, refinar en Prisma)

`User` · `PlayerProfile` · `Region` · `Comuna` · `Sector` · `Venue` (cancha) · `Team` ·
`TeamMember` · `TeamInvitation` · `Match` · `MatchParticipant` (jugador, lado A/B, estado
inscrito/espera/asistió/no-show) · `Challenge` (propuestas entre equipos) · `ResultReport` ·
`Goal` · `PeerReview` (valoración entre pares con etiquetas; antes "PlayerRating") · `RatingHistory` ·
`ResultObjection` · `ResultConfirmation` · `MatchMessage` (chat) · `ProfileComment` · `PlayerRequest` · `PlayerRequestResponse` · `League` · `Season` ·
`SeasonTeam` · `Notification` · `Report` (moderación) · `EmailCode` (código para confirmar el correo).

Reglas: IDs `cuid()`, `createdAt`/`updatedAt` en todas las tablas, soft-delete (`deletedAt`)
en usuarios, equipos y partidos, índices en campos de búsqueda (zona, fecha, estado).

---

## 8. Arquitectura y convenciones de código

```
src/
  app/                 # rutas (App Router). Grupos: (public), (auth), (app), admin
  components/
    ui/                # componentes shadcn
    features/          # componentes por dominio: match/, team/, player/, league/
  server/
    actions/           # Server Actions (mutaciones), siempre validan con Zod y permisos
    queries/           # lecturas a la BD
    services/          # lógica de negocio (armar equipos, cerrar partido, etc.)
  lib/
    rating/            # Elo, divisiones (funciones puras + tests)
    validations/       # esquemas Zod
    auth.ts, db.ts, utils.ts
  config/              # site.ts (APP_NAME, URLs), constantes
  generated/prisma/     # cliente Prisma generado (no se commitea)
prisma/
  schema.prisma, seed.ts
prisma.config.ts       # config de Prisma 7 (URL de migraciones, seed)
tests/
  e2e/                 # Playwright
```

- **Permisos siempre en el servidor** (nunca confiar en el cliente). Helper
  `requireUser()`, `requireTeamCaptain(teamId)`, `requireAdmin()`.
- Mutaciones con Server Actions; respuestas tipadas `{ ok: true, data } | { ok: false, error }`.
- Componentes de servidor por defecto; `"use client"` solo cuando haga falta interactividad.
- Mobile-first: diseñar primero para 375 px de ancho. Navegación inferior tipo app en móvil.
- Accesibilidad: labels, contraste AA, navegable con teclado.
- Variables de entorno documentadas en `.env.example`; nunca commitear secretos.
- Cada funcionalidad nueva incluye: migración Prisma (si aplica), validación Zod, tests de la
  lógica de negocio, y actualización de este archivo si cambia una regla.

---

## 9. Diseño visual

- Estética **amigable y luminosa, tipo app de juego**: fondo blanco, verde pasto como color principal,
  amarillo de acento, letra redondeada (**Nunito**), esquinas grandes y bordes de 2 px.
- **Relieve**: botones y tarjetas-enlace tienen un canto sólido abajo y se hunden al apretarlos (utilidad
  `relieve` en `globals.css`; cada color de acción tiene su `-canto`).
- **Mascota "Pichanguita"**: la pelota con cara (`Mascot` en `src/components/layout/brand.tsx`). Es el logo y
  aparece en la portada y el ingreso. No usar mascotas, logos ni pantallas de otras apps.
- Sin etiquetas chicas sobre los títulos, sin cristal/desenfoque y sin tarjetas dentro de tarjetas.
- Modo claro y oscuro (el oscuro tiene sus propios tonos, no es una inversión).
- Tarjetas de partido muy legibles: tipo, hora, cancha, cupos ("7/14"), rango promedio, botón
  grande "Sumarme".
- Insignias de división (Bronce → Diamante) consistentes en todo el sitio.

---

## 10. Forma de trabajo con la IA

1. Antes de programar una funcionalidad, proponer un plan breve (archivos a crear/modificar,
   cambios en la BD) y esperar confirmación si el cambio es grande.
2. Trabajar en **ramas** (`feature/nombre-corto`), nunca directo en `main`.
3. Commits pequeños con **Conventional Commits** en español:
   `feat: inscripción a revoltijos`, `fix: cálculo de cupos`, `docs: …`.
4. Correr `pnpm lint`, `pnpm typecheck` y `pnpm test` antes de dar algo por terminado.
5. Si un requisito es ambiguo, preguntar en vez de inventar.
6. Cuando el equipo agregue requisitos nuevos, actualizar este archivo y `docs/ROADMAP.md`.
