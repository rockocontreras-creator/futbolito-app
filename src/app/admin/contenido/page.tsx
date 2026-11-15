import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { DeleteContent } from "@/components/features/admin/admin-edit";
import { getAdmin, listContentForAdmin } from "@/server/queries/admin";

type Person = { name: string | null; profile: { displayName: string; username: string } | null };
const nameOf = (p: Person) => p.profile?.displayName ?? p.name ?? "Sin nombre";
const ago = (d: Date) => formatDistanceToNow(d, { addSuffix: true, locale: es });

export default async function AdminContent() {
  if (!(await getAdmin())) return null;
  const { comments, messages } = await listContentForAdmin();
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <section aria-labelledby="comentarios" className="space-y-3">
        <h2 id="comentarios" className="text-xl font-extrabold">
          Comentarios en perfiles ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="text-muted-foreground">Nadie ha comentado todavía.</p>
        ) : (
          <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
            {comments.map((c) => (
              <li key={c.id} className="space-y-2 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <b className="text-foreground">{nameOf(c.author)}</b> en el perfil de{" "}
                  {c.target.profile ? (
                    <Link
                      href={`/jugador/${c.target.profile.username}`}
                      className="font-bold hover:underline"
                    >
                      {nameOf(c.target)}
                    </Link>
                  ) : (
                    nameOf(c.target)
                  )}{" "}
                  · {ago(c.createdAt)}
                </p>
                <p className="text-[15px] break-words whitespace-pre-line">{c.body}</p>
                <DeleteContent kind="comment" contentId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="mensajes" className="space-y-3">
        <h2 id="mensajes" className="text-xl font-extrabold">
          Mensajes en salas de partido ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <p className="text-muted-foreground">Nadie ha escrito en una sala todavía.</p>
        ) : (
          <ul className="divide-y-2 overflow-hidden rounded-2xl border-2 bg-card">
            {messages.map((m) => (
              <li key={m.id} className="space-y-2 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <b className="text-foreground">{nameOf(m.user)}</b> en{" "}
                  <Link href={`/partidos/${m.matchId}`} className="font-bold hover:underline">
                    la sala de un partido
                  </Link>{" "}
                  · {ago(m.createdAt)}
                </p>
                <p className="text-[15px] break-words whitespace-pre-line">{m.body}</p>
                <DeleteContent kind="message" contentId={m.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
