import { ArrowLeft, Clock3, MapPin, Shield } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProfileRequired } from "@/components/features/auth/sign-in-required";
import { DivisionBadge } from "@/components/features/player/division-badge";
import { PlayerAvatar } from "@/components/features/player/player-avatar";
import {
  AnswerOffer,
  CloseRequest,
  OfferButton,
  WhatsAppContact,
  WithdrawOfferButton,
} from "@/components/features/request/request-actions";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { formatMatchDate } from "@/lib/format";
import { POSITION_LABEL } from "@/lib/labels";
import { requestShareText, whatsappTo, whatsappUrl } from "@/lib/share";
import { getRequest } from "@/server/queries/requests";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Se busca" };

const STATUS_TEXT = { OPEN: "Buscando", FILLED: "Completo", CANCELLED: "Cancelada" } as const;

export default function RequestPage({ params }: PageProps<"/se-busca/[id]">) {
  return (
    <Suspense fallback={<div className="h-56 chalk-pitch" aria-hidden />}>
      <RequestView params={params} />
    </Suspense>
  );
}

async function RequestView({ params }: { params: PageProps<"/se-busca/[id]">["params"] }) {
  const { id } = await params;
  const [req, user, h] = await Promise.all([getRequest(id), getCurrentUser(), headers()]);
  if (!req) notFound();

  const isAuthor = user?.id === req.authorId;
  const accepted = req.responses.filter((r) => r.status === "ACCEPTED");
  const pendingOffers = req.responses.filter((r) => r.status === "PENDING");
  const mine = req.responses.find((r) => r.userId === user?.id);
  const missing = Math.max(0, req.playersNeeded - accepted.length);
  const open = req.status === "OPEN" && req.startsAt > new Date();
  const positions = req.positions.map((p) => POSITION_LABEL[p]);
  const authorName = req.author.profile?.displayName ?? req.author.name ?? "Jugador";
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const share = requestShareText({
    playersNeeded: missing || req.playersNeeded,
    positions,
    startsAt: req.startsAt,
    venueName: req.venue?.name ?? null,
    url: `${origin}/se-busca/${req.id}`,
  });
  const authorWa =
    mine?.status === "ACCEPTED" && req.author.profile?.phone
      ? whatsappTo(req.author.profile.phone, `Hola, voy al partido del ${formatMatchDate(req.startsAt)}.`)
      : null;

  return (
    <>
      <section className="chalk-pitch text-white">
        <Container className="space-y-5 py-8 md:py-12">
          <Link
            href="/se-busca"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden /> Se busca
          </Link>
          <div className="flex flex-wrap items-end gap-6">
            <p className="leading-none">
              <span className="text-8xl font-score">{missing}</span>
              <span className="ml-2 text-xl font-semibold text-white/80">
                {missing === 1 ? "falta" : "faltan"}
              </span>
            </p>
            <div className="space-y-1.5 pb-2">
              <p className="inline-flex rounded-full bg-foco px-3 py-1 text-sm font-bold text-[#2a2205]">
                {STATUS_TEXT[req.status]}
              </p>
              <h1 className="text-3xl font-display sm:text-4xl">
                {positions.length ? positions.join(", ") : "Cualquier posición"}
              </h1>
            </div>
          </div>
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-lg text-white/85">
            <span className="inline-flex items-center gap-1.5 first-letter:uppercase">
              <Clock3 className="size-5" aria-hidden /> {formatMatchDate(req.startsAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-5" aria-hidden /> {req.venue?.name ?? "Cancha a coordinar"}
            </span>
          </p>
        </Container>
      </section>

      <Container className="grid gap-6 pt-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          {isAuthor && (
            <section className="rounded-xl border-2 border-foco bg-card" aria-labelledby="ofertas">
              <h2 id="ofertas" className="border-b px-5 py-4 text-lg font-bold">
                Se ofrecieron ({pendingOffers.length})
              </h2>
              {pendingOffers.length === 0 ? (
                <p className="px-5 py-5 text-sm text-muted-foreground">
                  Todavía nadie. Compártelo por WhatsApp para que llegue más rápido.
                </p>
              ) : (
                <ul className="divide-y">
                  {pendingOffers.map((r) => (
                    <OfferRow key={r.id} r={r} trailing={<AnswerOffer responseId={r.id} />} />
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="rounded-xl border bg-card" aria-labelledby="confirmados">
            <h2 id="confirmados" className="border-b px-5 py-4 text-lg font-bold">
              Confirmados ({accepted.length} de {req.playersNeeded})
            </h2>
            {accepted.length === 0 ? (
              <p className="px-5 py-5 text-sm text-muted-foreground">Aún nadie confirmado.</p>
            ) : (
              <ul className="divide-y">
                {accepted.map((r) => {
                  const wa =
                    isAuthor && r.user.profile?.phone
                      ? whatsappTo(
                          r.user.profile.phone,
                          `Hola! Te confirmo para el partido del ${formatMatchDate(req.startsAt)}.`,
                        )
                      : null;
                  return (
                    <OfferRow
                      key={r.id}
                      r={r}
                      trailing={wa ? <WhatsAppContact href={wa} label="Escribir" /> : undefined}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          {req.notes && (
            <section className="rounded-xl border bg-card p-5" aria-labelledby="detalles">
              <h2 id="detalles" className="mb-2 text-lg font-bold">
                Detalles
              </h2>
              <p className="text-[15px] whitespace-pre-line text-muted-foreground">{req.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <PlayerAvatar name={authorName} src={req.author.profile?.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-muted-foreground">Busca</p>
                {req.author.profile ? (
                  <Link
                    href={`/jugador/${req.author.profile.username}`}
                    className="font-bold hover:underline"
                  >
                    {authorName}
                  </Link>
                ) : (
                  <p className="font-bold">{authorName}</p>
                )}
              </div>
            </div>
            {(req.minRating != null || req.maxRating != null) && (
              <p className="flex items-center gap-1.5 text-sm">
                <Shield className="size-4 text-primary" aria-hidden /> Rango {req.minRating ?? "cualquiera"} a{" "}
                {req.maxRating ?? "cualquiera"}
              </p>
            )}

            {isAuthor ? (
              open || req.status === "FILLED" ? (
                <CloseRequest requestId={req.id} />
              ) : null
            ) : !user ? (
              <Button asChild size="lg" className="w-full">
                <Link href={`/ingresar?callbackUrl=${encodeURIComponent(`/se-busca/${req.id}`)}`}>
                  Ingresa para ofrecerte
                </Link>
              </Button>
            ) : !user.profile ? (
              <ProfileRequired next={`/se-busca/${req.id}`} />
            ) : mine?.status === "ACCEPTED" ? (
              <div className="space-y-2">
                <p className="rounded-full bg-primary/12 py-3 text-center text-sm font-bold text-primary">
                  ¡Te aceptaron! Vas a jugar
                </p>
                {authorWa ? (
                  <WhatsAppContact href={authorWa} label={`Escribirle a ${authorName.split(" ")[0]}`} />
                ) : (
                  <p className="text-[13px] text-muted-foreground">
                    {authorName} no tiene teléfono en su perfil: coordinen por comentarios en su perfil.
                  </p>
                )}
                <WithdrawOfferButton requestId={req.id} />
              </div>
            ) : mine?.status === "PENDING" ? (
              <div className="space-y-2">
                <p className="rounded-full bg-secondary py-3 text-center text-sm font-bold">
                  Te ofreciste. Falta que acepten.
                </p>
                <WithdrawOfferButton requestId={req.id} />
              </div>
            ) : mine?.status === "REJECTED" ? (
              <p className="rounded-full bg-secondary py-3 text-center text-sm font-bold">
                Esta vez no quedaste
              </p>
            ) : open ? (
              <OfferButton requestId={req.id} />
            ) : (
              <p className="rounded-full bg-secondary py-3 text-center text-sm font-bold">Búsqueda cerrada</p>
            )}

            {open && (
              <Button
                asChild
                variant="outline"
                className="w-full border-[#25D366] text-[#128C4B] hover:bg-[#25D366]/10 dark:text-[#5fe08f]"
              >
                <a href={whatsappUrl(share)} target="_blank" rel="noopener noreferrer">
                  Compartir por WhatsApp
                </a>
              </Button>
            )}
          </div>
          {isAuthor && (
            <p className="px-1 text-[13px] text-muted-foreground">
              Al aceptar a alguien ves su WhatsApp (si lo puso en su perfil) y él ve el tuyo.
            </p>
          )}
        </aside>
      </Container>
    </>
  );
}

function OfferRow({
  r,
  trailing,
}: {
  r: import("@/server/queries/requests").RequestDetail["responses"][number];
  trailing?: React.ReactNode;
}) {
  const p = r.user.profile;
  const name = p?.displayName ?? r.user.name ?? "Jugador";
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <PlayerAvatar name={name} src={p?.photoUrl ?? r.user.image} />
      <div className="min-w-0 flex-1">
        {p ? (
          <Link href={`/jugador/${p.username}`} className="font-semibold hover:underline">
            {name}
          </Link>
        ) : (
          <p className="font-semibold">{name}</p>
        )}
        <p className="text-[13px] text-muted-foreground">
          {p ? POSITION_LABEL[p.primaryPosition] : ""}
          {r.message ? ` · “${r.message}”` : ""}
        </p>
      </div>
      {trailing ?? (p && <DivisionBadge rating={p.rating} />)}
    </li>
  );
}
