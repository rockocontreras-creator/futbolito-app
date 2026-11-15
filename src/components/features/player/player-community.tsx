import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Flame, HeartHandshake, Megaphone, MessageSquare, Sparkles, ThumbsUp } from "lucide-react";
import Link from "next/link";
import type { PlayerProfile } from "@/generated/prisma/client";
import { COMMENDATIONS, totalCommends, type CommendationId } from "@/lib/commendations";
import { PLAYER_TAG_LABEL, type PlayerTagId } from "@/lib/labels";
import { nicknamesFor } from "@/lib/nicknames";
import { cn } from "@/lib/utils";
import type { PlayerCommunity as Community } from "@/server/queries/players";
import { CommentForm, DeleteCommentButton } from "./comment-box";
import { PlayerAvatar } from "./player-avatar";

const COMMEND_ICON: Record<CommendationId, typeof Flame> = {
  COMPANERO: HeartHandshake,
  LIDER: Megaphone,
  CRACK: Flame,
};

export interface CommunityViewer {
  userId: string | null;
  hasProfile: boolean;
  isAdmin: boolean;
}

/** Apodos de la cancha, valoraciones y comentarios del perfil. */
export function PlayerCommunity({
  profile,
  community,
  viewer,
}: {
  profile: PlayerProfile;
  community: Community;
  viewer: CommunityViewer;
}) {
  const nicknames = nicknamesFor({
    position: profile.primaryPosition,
    matchesPlayed: profile.matchesPlayed,
    wins: profile.wins,
    goals: profile.goals,
    mvps: profile.mvps,
    registrations: profile.registrations,
    attendances: profile.attendances,
    tags: community.tagCounts as Partial<Record<PlayerTagId, number>>,
    commends: community.commends,
    comments: community.comments.map((c) => c.body),
  });
  const topTags = Object.entries(community.tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6) as [PlayerTagId, number][];
  const isOwner = viewer.userId === profile.userId;
  const commendTotal = totalCommends(community.commends);

  return (
    <div className="space-y-6">
      <section aria-labelledby="apodos" className="space-y-3">
        <h2 id="apodos" className="flex items-center gap-2 text-lg font-extrabold">
          <Sparkles className="size-5 text-[#b38d00]" aria-hidden /> Apodos de la cancha
        </h2>
        {nicknames.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            Todavía sin apodo. Llega solo cuando las recomendaciones o los comentarios repiten algo (por
            ejemplo, 3 veces &ldquo;líder&rdquo;) o cuando las estadísticas destacan.
          </p>
        )}
        <ul className="flex flex-wrap gap-2">
          {nicknames.map((n) => (
            <li
              key={n.id}
              className={cn(
                "rounded-2xl border px-4 py-2.5",
                n.tone === "good" ? "border-primary/25 bg-primary/8" : "border-foco/60 bg-foco/15",
              )}
            >
              <span className="block text-xl font-display leading-tight">{n.title}</span>
              <span className="text-sm text-muted-foreground">{n.reason}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Se ganan solos: salen de las estadísticas, las recomendaciones de quienes juegan con{" "}
          {isOwner ? "contigo" : "él o ella"} y los comentarios.
        </p>
      </section>

      <section aria-labelledby="recomendaciones" className="space-y-3">
        <h2 id="recomendaciones" className="flex items-center gap-2 text-lg font-extrabold">
          <ThumbsUp className="size-5 text-primary" aria-hidden /> Recomendaciones
          <span className="text-sm font-normal text-muted-foreground">({commendTotal})</span>
        </h2>
        <ul className="grid grid-cols-3 gap-2">
          {COMMENDATIONS.map((c) => {
            const Icon = COMMEND_ICON[c.id];
            const count = community.commends[c.id];
            return (
              <li
                key={c.id}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 bg-card px-2 py-3 text-center",
                  count === 0 && "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-6", count > 0 && "text-primary")} aria-hidden />
                <span className="text-3xl leading-none font-score">{count}</span>
                <span className="text-sm leading-tight font-bold">{c.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">
          {commendTotal === 0
            ? "Todavía sin recomendaciones. Después de cada partido, quienes jugaron pueden recomendarse."
            : "Las dan quienes jugaron con él o ella, después de cada partido. Son anónimas."}
        </p>
        {topTags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas de valoraciones anteriores">
            {topTags.map(([tag, count]) => (
              <li key={tag} className="rounded-xl bg-secondary px-3 py-1 text-sm font-bold">
                {PLAYER_TAG_LABEL[tag]} <span className="text-muted-foreground">×{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="comentarios" className="space-y-3">
        <h2 id="comentarios" className="flex items-center gap-2 text-lg font-extrabold">
          <MessageSquare className="size-5 text-primary" aria-hidden /> Comentarios
          <span className="text-sm font-normal text-muted-foreground">({community.comments.length})</span>
        </h2>
        <div className="space-y-4 rounded-2xl border-2 bg-card p-4">
          {!isOwner &&
            (viewer.userId && viewer.hasProfile ? (
              <CommentForm
                targetUserId={profile.userId}
                targetName={profile.nickname || profile.displayName.split(" ")[0]!}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link
                  href={viewer.userId ? "/perfil" : `/ingresar?callbackUrl=/jugador/${profile.username}`}
                  className="font-extrabold text-primary hover:underline"
                >
                  {viewer.userId ? "Crea tu perfil" : "Ingresa"}
                </Link>{" "}
                para dejar un comentario.
              </p>
            ))}
          {community.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nadie ha comentado todavía.</p>
          ) : (
            <ul className="divide-y-2">
              {community.comments.map((c) => {
                const name = c.author.profile?.displayName ?? c.author.name ?? "Jugador";
                const canDelete = viewer.userId === c.authorId || isOwner || viewer.isAdmin;
                return (
                  <li key={c.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <PlayerAvatar
                      name={name}
                      src={c.author.profile?.photoUrl ?? c.author.image}
                      className="size-9 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {c.author.profile ? (
                          <Link
                            href={`/jugador/${c.author.profile.username}`}
                            className="font-extrabold hover:underline"
                          >
                            {name}
                          </Link>
                        ) : (
                          <span className="font-extrabold">{name}</span>
                        )}{" "}
                        <span className="text-muted-foreground">
                          hace {formatDistanceToNow(c.createdAt, { locale: es })}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[15px] break-words whitespace-pre-line">{c.body}</p>
                    </div>
                    {canDelete && <DeleteCommentButton commentId={c.id} />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
