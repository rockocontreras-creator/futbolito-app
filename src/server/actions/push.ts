"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { pushEndpointSchema, pushSubscriptionSchema } from "@/lib/validations/push";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";
import { sendPush } from "@/server/push";

/** Guarda el dispositivo donde el usuario activó los avisos. */
export async function subscribePush(input: unknown) {
  return runAction(pushSubscriptionSchema, input, async ({ endpoint, keys }) => {
    const user = await requireUser();
    const userAgent = (await headers()).get("user-agent")?.slice(0, 250) ?? null;
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id, userAgent },
      // Si el dispositivo era de otra cuenta (teléfono compartido), pasa a la cuenta actual.
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id, userAgent },
    });
    return null;
  });
}

/** Quita los avisos de este dispositivo. */
export async function unsubscribePush(input: unknown) {
  return runAction(pushEndpointSchema, input, async ({ endpoint }) => {
    const user = await requireUser();
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return null;
  });
}

/** Manda un aviso de prueba a los dispositivos del usuario. */
export async function sendTestPush() {
  return runAction(z.undefined(), undefined, async () => {
    const user = await requireUser();
    const sent = await sendPush([user.id], {
      title: "Los avisos funcionan",
      body: "Así te vamos a avisar de tus partidos.",
      url: "/notificaciones",
      tag: "prueba",
    });
    if (sent === 0) throw new AuthError("No pudimos mandar el aviso. Desactívalos y vuelve a activarlos.");
    return null;
  });
}
