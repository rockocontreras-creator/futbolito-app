"use server";

import { refresh } from "next/cache";
import { adminEmails } from "@/lib/auth";
import { userChangeProblem } from "@/lib/admin";
import { db } from "@/lib/db";
import { MAX_REPORTS_PER_DAY, reportCategoryLabel } from "@/lib/reports";
import { reportPlayerSchema, resolveReportSchema } from "@/lib/validations/report";
import { runAction } from "@/server/action-result";
import { AuthError, requireAdmin, requireUser } from "@/server/permissions";
import { notifyUsers } from "@/server/services/notify";

/** Reportar a un jugador. Llega al panel de administración; el reportado no sabe quién lo reportó. */
export async function reportPlayer(input: unknown) {
  return runAction(reportPlayerSchema, input, async ({ username, category, reason }) => {
    const user = await requireUser();
    const mine = await db.playerProfile.findUnique({
      where: { userId: user.id },
      select: { displayName: true },
    });
    if (!mine) throw new AuthError("Crea tu perfil para poder reportar.");
    const target = await db.playerProfile.findUnique({
      where: { username: username.toLowerCase() },
      select: { userId: true, displayName: true },
    });
    if (!target) throw new AuthError("Ese jugador no existe.");
    if (target.userId === user.id) throw new AuthError("No puedes reportarte a ti mismo.");

    const [open, today] = await Promise.all([
      db.report.findFirst({
        where: { authorId: user.id, targetUserId: target.userId, status: { in: ["OPEN", "REVIEWING"] } },
      }),
      db.report.count({
        where: { authorId: user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      }),
    ]);
    if (open) throw new AuthError("Ya reportaste a este jugador. Lo estamos revisando.");
    if (today >= MAX_REPORTS_PER_DAY) throw new AuthError("Llegaste al máximo de reportes por hoy.");

    const report = await db.report.create({
      data: { authorId: user.id, targetType: "USER", targetUserId: target.userId, category, reason },
    });
    const admins = await db.user.findMany({
      where: { role: "ADMIN", deletedAt: null, suspendedAt: null },
      select: { id: true },
    });
    await notifyUsers(
      admins.map((a) => a.id),
      {
        type: "SYSTEM",
        key: `report:${report.id}`,
        title: `Reportaron a ${target.displayName}`,
        body: reportCategoryLabel(category),
        href: "/admin/reportes",
      },
    );
    return null;
  });
}

/** Cerrar un reporte desde el panel: resuelto (con o sin suspensión) o descartado. */
export async function resolveReport(input: unknown) {
  return runAction(resolveReportSchema, input, async ({ reportId, outcome, suspend }) => {
    const admin = await requireAdmin();
    const report = await db.report.findUnique({
      where: { id: reportId },
      include: { targetUser: { select: { id: true, role: true, email: true } } },
    });
    if (!report) throw new AuthError("Ese reporte ya no existe.");
    if (suspend) {
      const target = report.targetUser;
      if (!target) throw new AuthError("Ese reporte no apunta a una cuenta.");
      const problem = userChangeProblem({
        actorId: admin.id,
        targetId: target.id,
        targetRole: target.role,
        targetEmail: target.email,
        adminEmails: adminEmails(),
        action: "suspend",
      });
      if (problem) throw new AuthError(problem);
      await db.user.update({ where: { id: target.id }, data: { suspendedAt: new Date() } });
    }
    await db.report.update({
      where: { id: reportId },
      data: {
        status: outcome,
        resolvedAt: new Date(),
        resolution: suspend ? "Cuenta suspendida" : outcome === "RESOLVED" ? "Revisado" : "Descartado",
      },
    });
    refresh();
    return null;
  });
}
