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
- [x] Login con correo o usuario y contraseña
- [ ] Activar Google: claves de Google OAuth en Vercel
- [ ] Recuperar contraseña y verificar correo (Resend)

## Fase 1 · MVP revoltijos (lo mínimo para jugar)

- [x] Rediseño "cancha de noche" (tipografía Archivo, header con navegación, portada con partidos reales)
- [x] Onboarding: crear perfil de jugador (posición, nivel → rating inicial, sector)
- [ ] Panel admin mínimo: cargar sectores y aprobar canchas
- [x] Proponer cancha (desde el formulario de publicar; queda pendiente de aprobación)
- [x] Publicar revoltijo, inscribirse, lista de espera, salirse
- [x] Feed "Partidos cerca de ti" (lista) con filtros básicos
- [x] Armar equipos (balance automático + ajuste manual), expulsar y mover jugadores
- [x] Compartir por WhatsApp
- [x] Reportar resultado (organizador) + objeción en 24 h → actualizar rango
- [x] Valoraciones entre jugadores con etiquetas, comentarios en perfiles y apodos automáticos
- [x] Foto de perfil (Supabase Storage)
- [x] Clasificación de jugadores y equipos
- [x] Mapa de canchas y proponer cancha con ubicación
- [x] Se busca jugadores
- [x] Torneos: página "Próximamente"
- [x] Perfil público `/jugador/[username]` con división y estadísticas
- [x] Sala (chat) del partido, colores de cada equipo, alerta de clima
- [x] Confirmación del resultado por mayoría
- [x] Etiquetas de perfil, posición comodín, edición de perfil, edad mínima 14
- [x] Carrusel de noticias en la portada
- [x] Nombre "Club de la Pichanga", rediseño amigable con mascota y carta de jugador
- [x] Entrar con Google y confirmar el correo con un código al crear cuenta
- [ ] Recuperar contraseña con un código por correo

## Fase 2 · Equipos y desafíos

- [x] Crear equipo (nombre y colores, escudo dibujado), plantel, pedir unirse, capitán acepta, salir
- [ ] Escudo con imagen (Supabase Storage), invitaciones por link y búsqueda
- [ ] "Buscamos rival": publicar, aceptar, contrapropuesta, desafío directo
- [ ] Reporte de resultado por ambos lados, disputas, autoconfirmación a las 48 h
- [ ] Rango de equipo + gráfico de evolución
- [~] Notificaciones en la app (campana) y por email — campana lista (confirmar resultado, clima); falta email

## Fase 3 · Ligas

- [ ] Solicitud y aprobación de organizadores
- [ ] Ligas, temporadas, inscripción de equipos
- [ ] Fixture todos contra todos (ida / ida y vuelta)
- [ ] Tabla de posiciones y goleadores

## Fase 4 · Pulido y comunidad

- [x] Vista mapa (Leaflet)
- [ ] Fair play: asistencia/no-shows y valoraciones entre pares
- [~] Moderación: panel `/admin` listo (canchas, resultados, usuarios, sectores); faltan los reportes
- [ ] PWA con push, íconos, modo offline básico
- [ ] Abrir otras comunas
