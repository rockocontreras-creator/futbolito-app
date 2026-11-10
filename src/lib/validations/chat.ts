import { z } from "zod";
import { idSchema } from "./common";

export const sendMessageSchema = z.object({
  matchId: idSchema,
  body: z.string().trim().min(1, "Escribe algo").max(500, "Máximo 500 caracteres"),
});

export const listMessagesSchema = z.object({
  matchId: idSchema,
  /** Solo mensajes posteriores a esta fecha ISO (para no traer todo en cada consulta). */
  after: z.iso.datetime().optional(),
});

export const messageIdSchema = z.object({ messageId: idSchema });
