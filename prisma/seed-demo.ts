// Datos de prueba para desarrollo local: canchas, jugadores y revoltijos.
// NO correr contra la base de producción. Uso: pnpm db:seed:demo
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Position, type SkillLevel } from "../src/generated/prisma/client";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
if (/supabase\.(com|co)|neon\.tech/.test(url) && process.env.ALLOW_DEMO_ON_REMOTE !== "1") {
  console.error(
    "Esta base parece ser la de producción. Para cargar datos de prueba ahí, usa ALLOW_DEMO_ON_REMOTE=1.",
  );
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const PLAYERS: [string, string, Position, SkillLevel, number][] = [
  ["Matías Rojas", "mati", "GOALKEEPER", "INTERMEDIATE", 1015],
  ["Benjamín Soto", "benja", "DEFENDER", "ADVANCED", 1180],
  ["Diego Muñoz", "dieguito", "MIDFIELDER", "INTERMEDIATE", 990],
  ["Felipe Contreras", "pipe", "FORWARD", "ADVANCED", 1320],
  ["Joaquín Vergara", "joaco", "MIDFIELDER", "BEGINNER", 870],
  ["Tomás Fuentes", "tomi", "DEFENDER", "INTERMEDIATE", 1060],
  ["Ignacia Pérez", "nacho", "FORWARD", "INTERMEDIATE", 1105],
  ["Cristóbal Lagos", "cristo", "GOALKEEPER", "BEGINNER", 905],
  ["Vicente Araya", "vicho", "MIDFIELDER", "ADVANCED", 1530],
];

// Datos extra para ver las etiquetas del perfil (Jugadora, Viejo crack, Joven promesa, Comodín).
const EXTRA: Record<string, { birthDate: Date; gender?: "FEMALE" | "MALE"; position?: Position }> = {
  mati: { birthDate: new Date("1996-04-12"), gender: "MALE" },
  benja: { birthDate: new Date("1984-09-03"), gender: "MALE" },
  dieguito: { birthDate: new Date("1999-01-20"), gender: "MALE", position: "FLEX" },
  pipe: { birthDate: new Date("1993-06-30"), gender: "MALE" },
  joaco: { birthDate: new Date("2010-02-14"), gender: "MALE" },
  tomi: { birthDate: new Date("2001-11-08") },
  nacho: { birthDate: new Date("1997-07-22"), gender: "FEMALE" },
  cristo: { birthDate: new Date("1988-05-01") },
  vicho: { birthDate: new Date("1989-12-15"), gender: "MALE" },
};

function at(daysFromNow: number, hour: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hour + 3, 0, 0, 0); // hora de Chile en verano (UTC-3)
  return d;
}

async function main() {
  const comuna = await db.comuna.findUniqueOrThrow({ where: { slug: "san-clemente" } });

  const venueData = [
    {
      name: "Cancha sintética El Estadio",
      surface: "SYNTHETIC" as const,
      hasLighting: true,
      referencePrice: 30000,
      // Coordenadas inventadas cerca del centro de San Clemente: solo para probar el mapa en local.
      latitude: -35.5368,
      longitude: -71.4889,
    },
    {
      name: "Complejo Los Aromos",
      surface: "SYNTHETIC" as const,
      hasLighting: true,
      isCovered: true,
      referencePrice: 36000,
      latitude: -35.5412,
      longitude: -71.4821,
    },
    { name: "Cancha de la Villa Esperanza", surface: "DIRT" as const, hasLighting: false },
  ];
  const venues = [];
  for (const v of venueData) {
    const existing = await db.venue.findFirst({ where: { name: v.name, comunaId: comuna.id } });
    venues.push(
      existing ?? (await db.venue.create({ data: { ...v, comunaId: comuna.id, status: "APPROVED" } })),
    );
  }

  const users = [];
  for (const [name, username, position, skill, rating] of PLAYERS) {
    const user = await db.user.upsert({
      where: { email: `${username}@demo.futbolito` },
      update: {},
      create: { email: `${username}@demo.futbolito`, name, emailVerified: new Date() },
    });
    await db.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        username,
        displayName: name,
        comunaId: comuna.id,
        primaryPosition: EXTRA[username]?.position ?? position,
        birthDate: EXTRA[username]?.birthDate,
        gender: EXTRA[username]?.gender,
        skillLevel: skill,
        rating,
        matchesPlayed: Math.round(rating / 90),
        wins: Math.round(rating / 200),
        draws: 2,
        losses: Math.max(Math.round(rating / 90) - Math.round(rating / 200) - 2, 0),
        goals: position === "FORWARD" ? 14 : 3,
        registrations: 12,
        attendances: 11,
      },
    });
    users.push(user);
  }

  if ((await db.match.count({ where: { comunaId: comuna.id } })) > 0) {
    console.log("Ya hay partidos; no se crean más.");
    return;
  }

  const matches = [
    {
      venue: venues[0]!,
      start: at(0, 21),
      side: 7,
      max: 14,
      players: 11,
      price: 2500,
      notes: "Traigan peto blanco y oscuro.",
    },
    { venue: venues[1]!, start: at(2, 20), side: 6, max: 12, players: 12, waitlist: 1, price: 3000 },
    { venue: venues[2]!, start: at(4, 18), side: 7, max: 14, players: 5, minRating: 900 },
  ];
  for (const m of matches) {
    const roster = users.slice(0, m.players);
    const waiting = users.slice(m.players, m.players + (m.waitlist ?? 0));
    await db.match.create({
      data: {
        type: "PICKUP",
        status: roster.length >= m.max ? "FULL" : "OPEN",
        comunaId: comuna.id,
        venueId: m.venue.id,
        organizerId: roster[0]!.id,
        startsAt: m.start,
        playersPerSide: m.side,
        maxPlayers: m.max,
        pricePerPerson: m.price,
        minRating: m.minRating,
        notes: m.notes,
        participants: {
          create: [
            ...roster.map((u) => ({ userId: u.id, status: "REGISTERED" as const })),
            ...waiting.map((u) => ({ userId: u.id, status: "WAITLIST" as const })),
          ],
        },
      },
    });
  }
  console.log("Datos de prueba listos: 3 canchas, 9 jugadores, 3 revoltijos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
