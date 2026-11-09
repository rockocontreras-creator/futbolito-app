// Seed mínimo: Región del Maule + comuna de San Clemente (activa).
// Por decisión del proyecto NO se crean sectores: los carga un admin desde el panel.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function main() {
  const maule = await db.region.upsert({
    where: { code: "VII" },
    update: {},
    create: { name: "Región del Maule", code: "VII" },
  });

  await db.comuna.upsert({
    where: { slug: "san-clemente" },
    update: { isActive: true },
    create: {
      name: "San Clemente",
      slug: "san-clemente",
      regionId: maule.id,
      isActive: true,
      latitude: -35.5386,
      longitude: -71.4867,
    },
  });

  // Admin inicial opcional: SEED_ADMIN_EMAIL=tu@correo.cl pnpm db:seed
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (adminEmail) {
    await db.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN" },
      create: { email: adminEmail, role: "ADMIN" },
    });
  }

  console.log("Seed listo: Región del Maule / San Clemente (activa).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
