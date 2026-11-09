import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

// Proponer una cancha (CLAUDE.md §5.6). Queda PENDING hasta que la apruebe un admin.
export const proposeVenueSchema = z.object({
  name: z.string().trim().min(3, "Mínimo 3 letras").max(80),
  surface: z.enum(["SYNTHETIC", "NATURAL", "DIRT"]),
  address: optionalText(120),
  latitude: z.coerce.number({ error: "Marca la cancha en el mapa" }).min(-56).max(-17),
  longitude: z.coerce.number({ error: "Marca la cancha en el mapa" }).min(-76).max(-66),
  isCovered: z.boolean().default(false),
  hasLighting: z.boolean().default(false),
  referencePrice: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(500_000).optional(),
  ),
  contact: optionalText(80),
});
export type ProposeVenueInput = z.input<typeof proposeVenueSchema>;
