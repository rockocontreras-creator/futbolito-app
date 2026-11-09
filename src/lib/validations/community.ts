import { z } from "zod";
import { idSchema } from "./common";

export const profileCommentSchema = z.object({
  targetUserId: idSchema,
  body: z.string().trim().min(2, "Escribe algo").max(280, "Máximo 280 caracteres"),
});

export const commentIdSchema = z.object({ commentId: idSchema });
