"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import {
  answerResponseSchema,
  closeRequestSchema,
  createRequestSchema,
  requestIdSchema,
  respondSchema,
} from "@/lib/validations/request";
import { runAction } from "@/server/action-result";
import { AuthError, requireUser } from "@/server/permissions";

async function requireProfile() {
  const user = await requireUser();
  const profile = await db.playerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) throw new AuthError("Primero crea tu perfil de jugador.");
  return { user, profile };
}

/** Publicar "se busca": faltan N jugadores (y opcionalmente qué posiciones). */
export async function createPlayerRequest(input: unknown) {
  return runAction(createRequestSchema, input, async (data) => {
    const { user, profile } = await requireProfile();
    let venueId: string | null = null;
    if (data.venueId) {
      const venue = await db.venue.findFirst({
        where: {
          id: data.venueId,
          comunaId: profile.comunaId,
          OR: [{ status: "APPROVED" }, { status: "PENDING", proposedById: user.id }],
        },
      });
      if (!venue) throw new AuthError("Esa cancha no está disponible.");
      venueId = venue.id;
    }
    const open = await db.playerRequest.count({
      where: { authorId: user.id, status: "OPEN", startsAt: { gte: new Date() } },
    });
    if (open >= 5) throw new AuthError("Tienes 5 búsquedas abiertas. Cierra alguna antes de publicar otra.");

    const req = await db.playerRequest.create({
      data: {
        authorId: user.id,
        comunaId: profile.comunaId,
        venueId,
        startsAt: data.startsAtLocal,
        playersNeeded: data.playersNeeded,
        positions: data.positions,
        minRating: data.minRating,
        maxRating: data.maxRating,
        notes: data.notes || null,
      },
    });
    return { id: req.id };
  });
}

/** "Me ofrezco". */
export async function offerToPlay(input: unknown) {
  return runAction(respondSchema, input, async ({ requestId, message }) => {
    const { user, profile } = await requireProfile();
    const req = await db.playerRequest.findUnique({ where: { id: requestId } });
    if (!req || req.status !== "OPEN" || req.startsAt <= new Date())
      throw new AuthError("Esta búsqueda ya está cerrada.");
    if (req.authorId === user.id) throw new AuthError("Es tu propia búsqueda.");
    if (req.minRating != null && profile.rating < req.minRating)
      throw new AuthError(`Buscan rango ${req.minRating} o más.`);
    if (req.maxRating != null && profile.rating > req.maxRating)
      throw new AuthError(`Buscan rango ${req.maxRating} o menos.`);
    await db.playerRequestResponse.upsert({
      where: { requestId_userId: { requestId, userId: user.id } },
      create: { requestId, userId: user.id, message: message || null },
      update: { status: "PENDING", message: message || null },
    });
    refresh();
    return { offered: true };
  });
}

/** Retirar mi oferta. */
export async function withdrawOffer(input: unknown) {
  return runAction(requestIdSchema, input, async ({ requestId }) => {
    const user = await requireUser();
    await db.playerRequestResponse.updateMany({
      where: { requestId, userId: user.id, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "WITHDRAWN" },
    });
    // Si había quedado completa y alguien se baja, se vuelve a abrir.
    const req = await db.playerRequest.findUnique({ where: { id: requestId } });
    if (req?.status === "FILLED" && req.startsAt > new Date()) {
      const accepted = await db.playerRequestResponse.count({ where: { requestId, status: "ACCEPTED" } });
      if (accepted < req.playersNeeded)
        await db.playerRequest.update({ where: { id: requestId }, data: { status: "OPEN" } });
    }
    refresh();
    return { withdrawn: true };
  });
}

/** El autor acepta o rechaza a quien se ofreció. Al completar los cupos, la búsqueda se cierra sola. */
export async function answerOffer(input: unknown) {
  return runAction(answerResponseSchema, input, async ({ responseId, accept }) => {
    const user = await requireUser();
    const result = await db.$transaction(async (tx) => {
      const resp = await tx.playerRequestResponse.findUnique({
        where: { id: responseId },
        include: { request: true },
      });
      if (!resp || resp.request.authorId !== user.id) throw new AuthError("No puedes responder esta oferta.");
      if (resp.status !== "PENDING") throw new AuthError("Esta oferta ya fue respondida.");
      await tx.$queryRaw`SELECT id FROM "PlayerRequest" WHERE id = ${resp.requestId} FOR UPDATE`;
      if (accept) {
        const accepted = await tx.playerRequestResponse.count({
          where: { requestId: resp.requestId, status: "ACCEPTED" },
        });
        if (accepted >= resp.request.playersNeeded) throw new AuthError("Ya completaste los cupos.");
        await tx.playerRequestResponse.update({ where: { id: responseId }, data: { status: "ACCEPTED" } });
        if (accepted + 1 >= resp.request.playersNeeded) {
          await tx.playerRequest.update({ where: { id: resp.requestId }, data: { status: "FILLED" } });
        }
      } else {
        await tx.playerRequestResponse.update({ where: { id: responseId }, data: { status: "REJECTED" } });
      }
      return { accepted: accept };
    });
    refresh();
    return result;
  });
}

/** El autor cierra la búsqueda (ya encontró o se cayó el partido). */
export async function closePlayerRequest(input: unknown) {
  return runAction(closeRequestSchema, input, async ({ requestId, filled }) => {
    const user = await requireUser();
    const req = await db.playerRequest.findUnique({ where: { id: requestId } });
    if (!req || req.authorId !== user.id) throw new AuthError("No puedes cerrar esta búsqueda.");
    await db.playerRequest.update({
      where: { id: requestId },
      data: { status: filled ? "FILLED" : "CANCELLED" },
    });
    refresh();
    return { closed: true };
  });
}
