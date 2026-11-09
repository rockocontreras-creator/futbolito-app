# Roadmap

Fases cortas, cada una deployable. Marcar con [x] al terminar.

## Fase 0 · Base ✅

- [x] Next.js + TypeScript strict + Tailwind + shadcn/ui
- [x] Esquema Prisma completo (zonas, jugadores, equipos, partidos, resultados, ligas, moderación)
- [x] Seed: Región del Maule + San Clemente activa
- [x] Lógica de rango (Elo, divisiones) y "Armar equipos" con tests
- [x] Auth.js (Google + enlace mágico) cableado
- [x] Lint, Prettier, Husky, Vitest, Playwright, CI en GitHub Actions
- [x] Crear proyecto en Supabase y migración inicial
- [x] Conectar Vercel
- [ ] Activar el login: claves de Google OAuth y/o Resend en Vercel

## Fase 1 · MVP revoltijos (lo mínimo para jugar)

- [x] Rediseño "cancha de noche" (tipografía Archivo, header con navegación, portada con partidos reales)
- [x] Onboarding: crear perfil de jugador (posición, nivel → rating inicial, sector)
- [ ] Panel admin mínimo: cargar sectores y aprobar canchas
- [x] Proponer cancha (desde el formulario de publicar; queda pendiente de aprobación)
- [x] Publicar revoltijo, inscribirse, lista de espera, salirse
- [x] Feed "Partidos cerca de ti" (lista) con filtros básicos
- [ ] Armar equipos (balance automático + ajuste manual)
- [x] Compartir por WhatsApp
- [ ] Reportar resultado (organizador) + objeción en 24 h → actualizar rango
- [x] Perfil público `/jugador/[username]` con división y estadísticas

## Fase 2 · Equipos y desafíos

- [x] Crear equipo (nombre y colores, escudo dibujado), plantel, pedir unirse, capitán acepta, salir
- [ ] Escudo con imagen (Supabase Storage), invitaciones por link y búsqueda
- [ ] "Buscamos rival": publicar, aceptar, contrapropuesta, desafío directo
- [ ] Reporte de resultado por ambos lados, disputas, autoconfirmación a las 48 h
- [ ] Rango de equipo + gráfico de evolución
- [ ] Notificaciones en la app (campana) y por email

## Fase 3 · Ligas

- [ ] Solicitud y aprobación de organizadores
- [ ] Ligas, temporadas, inscripción de equipos
- [ ] Fixture todos contra todos (ida / ida y vuelta)
- [ ] Tabla de posiciones y goleadores

## Fase 4 · Pulido y comunidad

- [ ] Vista mapa (Leaflet)
- [ ] Fair play: asistencia/no-shows y valoraciones entre pares
- [ ] Moderación: reportes, suspensiones
- [ ] PWA con push, íconos, modo offline básico
- [ ] Abrir otras comunas
