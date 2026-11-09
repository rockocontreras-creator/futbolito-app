"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeProfilePhoto, uploadProfilePhoto } from "@/server/actions/photo";
import { PlayerAvatar } from "./player-avatar";

const SIZE = 512;

/** Recorta al centro en cuadrado y achica a 512 px WebP (o JPEG si el navegador no sabe WebP). */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  return (await toBlob("image/jpeg"))!;
}

export function PhotoUpload({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const blob = await prepare(file);
        const fd = new FormData();
        fd.set("photo", blob, "foto");
        const res = await uploadProfilePhoto(fd);
        if (res.ok) setPreview(res.data.url);
        else setError(res.error);
      } catch {
        setError("No pudimos leer esa imagen. Prueba con otra foto.");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  return (
    <div className="flex items-center gap-4">
      <PlayerAvatar name={name} src={preview} className="size-20 text-2xl" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => input.current?.click()}>
            <Camera aria-hidden /> {pending ? "Subiendo…" : preview ? "Cambiar foto" : "Subir foto"}
          </Button>
          {preview && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await removeProfilePhoto();
                  if (res.ok) setPreview(null);
                  else setError(res.error);
                })
              }
            >
              <Trash2 aria-hidden /> Quitar
            </Button>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground">Se recorta en cuadrado. JPG, PNG o WebP.</p>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
