"use server";

import { INITIAL_PLAYER_RATING } from "@/lib/rating/elo";
import { db } from "@/lib/db";
import { playerProfileSchema } from "@/lib/validations/player";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";
import { getActiveComuna } from "@/server/queries/zones";

/** Crea el perfil de jugador. El nivel autodeclarado define el rating inicial. */
export async function createProfile(input: unknown) {
  return runAction(playerProfileSchema, input, async (data) => {
    const user = await requireUser();
    if (await db.playerProfile.findUnique({ where: { userId: user.id } })) {
      throw new AuthError("Ya tienes un perfil creado.");
    }
    if (await db.playerProfile.findUnique({ where: { username: data.username } })) {
      throw new FieldError("username", "Ese usuario ya está tomado. Prueba con otro.");
    }
    const comuna = await getActiveComuna();
    if (!comuna) throw new AuthError("No hay comunas activas todavía.");
    const sector = data.sectorId
      ? await db.sector.findFirst({ where: { id: data.sectorId, comunaId: comuna.id } })
      : null;

    const profile = await db.playerProfile.create({
      data: {
        userId: user.id,
        username: data.username,
        displayName: data.displayName,
        nickname: data.nickname,
        birthDate: data.birthDate,
        phone: data.phone,
        comunaId: comuna.id,
        sectorId: sector?.id,
        primaryPosition: data.primaryPosition,
        secondaryPosition: data.secondaryPosition,
        foot: data.foot,
        skillLevel: data.skillLevel,
        rating: INITIAL_PLAYER_RATING[data.skillLevel],
      },
    });
    return { username: profile.username };
  });
}

/** Error de un campo puntual, para mostrarlo bajo ese input. */
class FieldError extends AuthError {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
  }
}
