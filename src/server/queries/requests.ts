import "server-only";
import type { Position } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export function listOpenRequests(comunaId: string, position?: Position) {
  return db.playerRequest.findMany({
    where: {
      comunaId,
      status: "OPEN",
      startsAt: { gte: new Date() },
      ...(position ? { OR: [{ positions: { has: position } }, { positions: { isEmpty: true } }] } : {}),
    },
    orderBy: { startsAt: "asc" },
    take: 50,
    include: {
      venue: { select: { name: true } },
      author: {
        select: { name: true, profile: { select: { displayName: true, username: true, photoUrl: true } } },
      },
      _count: { select: { responses: { where: { status: "ACCEPTED" } } } },
    },
  });
}

export type RequestListItem = Awaited<ReturnType<typeof listOpenRequests>>[number];

export function getRequest(id: string) {
  return db.playerRequest.findUnique({
    where: { id },
    include: {
      venue: true,
      author: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              displayName: true,
              username: true,
              photoUrl: true,
              phone: true,
              birthDate: true,
              rating: true,
            },
          },
        },
      },
      responses: {
        where: { status: { in: ["PENDING", "ACCEPTED", "REJECTED"] } },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              profile: {
                select: {
                  displayName: true,
                  username: true,
                  photoUrl: true,
                  phone: true,
                  birthDate: true,
                  rating: true,
                  primaryPosition: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export type RequestDetail = NonNullable<Awaited<ReturnType<typeof getRequest>>>;
