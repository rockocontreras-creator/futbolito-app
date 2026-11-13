"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useServerAction } from "@/components/features/use-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addProfileComment, deleteProfileComment } from "@/server/actions/community";

export function CommentForm({ targetUserId, targetName }: { targetUserId: string; targetName: string }) {
  const [body, setBody] = useState("");
  const { pending, error, run } = useServerAction();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addProfileComment({ targetUserId, body }),
          () => setBody(""),
        );
      }}
    >
      <label htmlFor="comment" className="sr-only">
        Comentario para {targetName}
      </label>
      <Textarea
        id="comment"
        value={body}
        maxLength={280}
        onChange={(e) => setBody(e.target.value)}
        placeholder={`¿Cómo es jugar con ${targetName}?`}
        className="min-h-20"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{body.length}/280</span>
        <Button type="submit" size="sm" disabled={pending || body.trim().length < 2}>
          {pending ? "Publicando…" : "Comentar"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const { pending, error, run } = useServerAction();
  return (
    <span className="flex flex-col items-end">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        aria-label="Borrar comentario"
        disabled={pending}
        onClick={() => {
          if (window.confirm("¿Borrar este comentario?")) run(() => deleteProfileComment({ commentId }));
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
