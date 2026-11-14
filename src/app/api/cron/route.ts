import { timingSafeEqual } from "node:crypto";
import { runScheduledJobs } from "@/server/services/scheduled";
import { getSetting } from "@/server/settings";

// El reloj de la app. Lo llama Supabase (pg_cron) cada 10 minutos con el secreto guardado en AppSetting.

export async function POST(request: Request) {
  const secret = await getSetting("cronSecret");
  const given = request.headers.get("x-cron-key") ?? "";
  const ok =
    secret !== null &&
    secret.length >= 32 &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("No autorizado", { status: 401 });
  const result = await runScheduledJobs();
  return Response.json({ ok: true, ...result });
}
