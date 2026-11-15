import { z } from "zod";
import { parseLocalDateTime } from "@/lib/dates";

const id = z.string().min(1).max(40);

export const reviewVenueSchema = z.object({ venueId: id, status: z.enum(["APPROVED", "REJECTED"]) });

export const resolveResultSchema = z.object({
  matchId: id,
  scoreA: z.coerce.number().int().min(0).max(60),
  scoreB: z.coerce.number().int().min(0).max(60),
});

export const adminMatchSchema = z.object({ matchId: id });

export const setRoleSchema = z.object({ userId: id, role: z.enum(["PLAYER", "ORGANIZER", "ADMIN"]) });

export const setSuspendedSchema = z.object({ userId: id, suspended: z.boolean() });

const sectorName = z.string().trim().min(2, "Mínimo 2 letras").max(60, "Máximo 60 letras");
export const createSectorSchema = z.object({ name: sectorName });
export const updateSectorSchema = z.object({
  sectorId: id,
  name: sectorName.optional(),
  isActive: z.boolean().optional(),
});

// Editar un partido por jugar. La fecha llega como "2026-11-14T20:00" en hora de Chile.
export const updateMatchSchema = z.object({
  matchId: id,
  startsAtLocal: z
    .string()
    .transform((v, ctx) => {
      const d = parseLocalDateTime(v);
      if (!d) {
        ctx.addIssue({ code: "custom", message: "Elige día y hora" });
        return z.NEVER;
      }
      return d;
    })
    .refine((d) => d.getTime() > Date.now(), "La fecha tiene que ser futura"),
  /** Vacío = cancha a coordinar (solo partidos entre equipos). */
  venueId: z.string().max(40).default(""),
  maxPlayers: z.coerce.number().int().min(8, "Mínimo 8 cupos").max(30, "Máximo 30 cupos").optional(),
  notes: z.string().trim().max(500, "Máximo 500 letras").default(""),
});

export const updateTeamSchema = z.object({
  teamId: id,
  name: z.string().trim().min(3, "Mínimo 3 letras").max(40, "Máximo 40 letras"),
  description: z.string().trim().max(300, "Máximo 300 letras").default(""),
});
export const adminTeamSchema = z.object({ teamId: id });

export const updateProfileAsAdminSchema = z.object({
  userId: id,
  displayName: z.string().trim().min(3, "Mínimo 3 letras").max(60, "Máximo 60 letras"),
  nickname: z.string().trim().max(30, "Máximo 30 letras").default(""),
  removePhoto: z.boolean().default(false),
});

export const deleteContentSchema = z.object({ kind: z.enum(["comment", "message"]), contentId: id });

export const BROADCAST_LINKS = {
  "": "Sin enlace",
  "/partidos": "Lista de partidos",
  "/desafios": "Desafíos",
  "/ranking": "Ranking",
  "/canchas": "Canchas",
} as const;

export const broadcastSchema = z.object({
  title: z.string().trim().min(4, "Mínimo 4 letras").max(60, "Máximo 60 letras"),
  body: z.string().trim().max(200, "Máximo 200 letras").default(""),
  href: z.enum(Object.keys(BROADCAST_LINKS) as [keyof typeof BROADCAST_LINKS]).default(""),
});
