import "server-only";
import { generateVAPIDKeys, sendNotification } from "web-push";
import { APP_URL, CONTACT_EMAIL } from "@/config/site";
import { db } from "@/lib/db";
import { getOrCreateSetting } from "./settings";

// Avisos al celular (Web Push). Las llaves VAPID se crean solas la primera vez y viven en AppSetting.

export interface PushPayload {
  title: string;
  body?: string;
  /** A dónde lleva al tocar el aviso. */
  url?: string;
  /** Avisos con el mismo tag se reemplazan en vez de apilarse. */
  tag?: string;
}

interface Vapid {
  publicKey: string;
  privateKey: string;
}

let cached: Vapid | null = null;
async function vapid(): Promise<Vapid> {
  cached ??= JSON.parse(
    await getOrCreateSetting("vapid", () => JSON.stringify(generateVAPIDKeys())),
  ) as Vapid;
  return cached;
}

/** Llave pública que el navegador necesita para suscribirse. */
export async function pushPublicKey(): Promise<string> {
  return (await vapid()).publicKey;
}

// El servicio de avisos exige un contacto: un correo o una dirección https.
function subject(): string {
  if (CONTACT_EMAIL) return `mailto:${CONTACT_EMAIL}`;
  return APP_URL.startsWith("https://") ? APP_URL : "mailto:avisos@clubdelapichanga.cl";
}

/** Manda el aviso a todos los dispositivos de esos usuarios. Nunca lanza error: un aviso fallido no rompe nada. */
export async function sendPush(userIds: readonly string[], payload: PushPayload): Promise<number> {
  if (userIds.length === 0) return 0;
  try {
    const subs = await db.pushSubscription.findMany({ where: { userId: { in: [...new Set(userIds)] } } });
    if (subs.length === 0) return 0;
    const keys = await vapid();
    const body = JSON.stringify(payload);
    let sent = 0;
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
            vapidDetails: { subject: subject(), ...keys },
            TTL: 6 * 3600,
            urgency: "high",
          });
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // 404/410: el dispositivo ya no existe o quitó el permiso.
          if (status === 404 || status === 410) gone.push(s.id);
          else console.error("[avisos]", status ?? "", (e as Error).message);
        }
      }),
    );
    if (gone.length) await db.pushSubscription.deleteMany({ where: { id: { in: gone } } });
    return sent;
  } catch (e) {
    console.error("[avisos]", e);
    return 0;
  }
}
