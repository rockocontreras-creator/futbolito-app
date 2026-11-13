import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { APP_NAME } from "@/config/site";
import { db } from "@/lib/db";
import { CODE_TTL_MS, canSendCode, codeState, type CodeState } from "@/lib/email-code";
import { sendMail } from "@/server/mail";

function hashCode(email: string, code: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret")
    .update(`${email}:${code}`)
    .digest("hex");
}

export type SendResult = { ok: true } | { ok: false; error: string };

/** Genera un código nuevo (invalida los anteriores) y lo manda por correo. */
export async function sendEmailCode(email: string, name?: string | null): Promise<SendResult> {
  const recent = await db.emailCode.findMany({
    where: { email, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    select: { createdAt: true },
  });
  const check = canSendCode(recent.map((r) => r.createdAt));
  if (!check.ok) {
    return {
      ok: false,
      error:
        check.reason === "cooldown"
          ? `Espera ${check.waitSeconds} s para pedir otro código.`
          : `Pediste muchos códigos. Prueba de nuevo en ${Math.ceil(check.waitSeconds / 60)} min.`,
    };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Se marcan como usados los códigos anteriores (pero se conservan para el límite por hora).
  await db.emailCode.updateMany({ where: { email }, data: { expiresAt: new Date() } });
  const row = await db.emailCode.create({
    data: { email, codeHash: hashCode(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  const pretty = `${code.slice(0, 3)} ${code.slice(3)}`;
  const hello = name ? `Hola ${name.split(" ")[0]}:` : "Hola:";
  try {
    await sendMail({
      to: email,
      subject: `${pretty} es tu código de ${APP_NAME}`,
      text: `${hello}\n\nTu código para confirmar el correo es ${pretty}. Vence en 15 minutos.\n\nSi no creaste una cuenta en ${APP_NAME}, ignora este correo.`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#10241a">
  <p style="font-size:16px">${hello}</p>
  <p style="font-size:16px">Tu código para confirmar el correo en <b>${APP_NAME}</b> es:</p>
  <p style="font-size:36px;font-weight:800;letter-spacing:8px;background:#0e5a36;color:#fff;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${pretty}</p>
  <p style="font-size:14px;color:#4b5b52">Vence en 15 minutos. Si no creaste una cuenta, ignora este correo.</p>
</div>`,
    });
  } catch (e) {
    await db.emailCode.delete({ where: { id: row.id } });
    console.error("No se pudo enviar el código", e);
    return {
      ok: false,
      error:
        e instanceof Error && e.message === "MAIL_NOT_CONFIGURED"
          ? "El envío de correos aún no está configurado. Por ahora entra con Google."
          : "No pudimos enviar el correo. Revisa la dirección o inténtalo en un rato.",
    };
  }
  return { ok: true };
}

/** Revisa el código. Si es correcto, lo consume. */
export async function checkEmailCode(email: string, code: string): Promise<CodeState> {
  const row = await db.emailCode.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
  const expected = row ? Buffer.from(row.codeHash, "hex") : null;
  const given = Buffer.from(hashCode(email, code), "hex");
  const matches = Boolean(expected && expected.length === given.length && timingSafeEqual(expected, given));
  const state = codeState(row, matches);
  if (row && state === "wrong")
    await db.emailCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
  if (row && state === "ok")
    await db.emailCode.update({ where: { id: row.id }, data: { expiresAt: new Date() } });
  return state;
}
