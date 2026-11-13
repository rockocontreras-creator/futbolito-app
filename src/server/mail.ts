import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { APP_NAME } from "@/config/site";

// Correos salientes por SMTP. Por defecto Gmail con "contraseña de aplicación" (gratis, ~500 al día).
// Variables: EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD y opcionales EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_FROM.

export function isMailConfigured(): boolean {
  return Boolean(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD);
}

let transport: Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.EMAIL_SERVER_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD?.replace(/\s/g, ""),
      },
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transport;
}

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }) {
  if (!isMailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      // En desarrollo sin SMTP, el correo se ve en la consola.
      console.info(`\n[correo a ${msg.to}] ${msg.subject}\n${msg.text}\n`);
      return;
    }
    throw new Error("MAIL_NOT_CONFIGURED");
  }
  await getTransport().sendMail({
    from: process.env.EMAIL_FROM || `"${APP_NAME}" <${process.env.EMAIL_SERVER_USER}>`,
    ...msg,
  });
}
