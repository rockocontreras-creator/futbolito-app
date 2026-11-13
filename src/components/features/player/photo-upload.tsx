"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeProfilePhoto, uploadProfilePhoto } from "@/server/actions/photo";
import { PlayerAvatar } from "./player-avatar";

const SIZE = 512;

/** Recorta al centro en cuadrado y achica a 512 px WebP (o JPEG si el navegador no sabe WebP). */
export async function preparePhoto(file: File): Promise<Blob> {
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
        const blob = await preparePhoto(file);
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
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={preview ? "Cambiar foto de perfil" : "Subir foto de perfil"}
        className="group relative shrink-0 rounded-full focus-visible:ring-4 focus-visible:ring-ring/35 focus-visible:outline-none"
      >
        <PlayerAvatar name={name} src={preview} className="size-24 border-4 border-border text-3xl" />
        <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-xl border-2 border-card bg-foco text-accent-foreground">
          <Camera className="size-5" aria-hidden strokeWidth={2.4} />
        </span>
      </button>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => input.current?.click()}>
            {pending ? "Subiendo…" : preview ? "Cambiar foto" : "Subir foto"}
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
        <p className="text-sm text-muted-foreground">Sale en tu carta de jugador. JPG, PNG o WebP.</p>
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
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

/**
 * Elegir foto antes de tener perfil (al crearlo): solo la prepara y la muestra;
 * el formulario la sube después de crear el perfil.
 */
export function PhotoPicker({
  name,
  fallbackUrl,
  onPick,
}: {
  name: string;
  /** Foto que ya trae la cuenta (por ejemplo, la de Google). */
  fallbackUrl?: string | null;
  onPick: (photo: Blob | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const blob = await preparePhoto(file);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(blob));
      onPick(blob);
    } catch {
      setError("No pudimos leer esa imagen. Prueba con otra foto.");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={preview ? "Cambiar foto" : "Elegir foto"}
        className="relative shrink-0 rounded-full focus-visible:ring-4 focus-visible:ring-ring/35 focus-visible:outline-none"
      >
        <PlayerAvatar
          name={name || "?"}
          src={preview ?? fallbackUrl}
          className="size-24 border-4 border-border text-3xl"
        />
        <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-xl border-2 border-card bg-foco text-accent-foreground">
          <Camera className="size-5" aria-hidden strokeWidth={2.4} />
        </span>
      </button>
      <div className="space-y-2">
        <p className="font-extrabold">Tu foto</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>
            {preview ? "Cambiar foto" : "Elegir foto"}
          </Button>
          {preview && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                URL.revokeObjectURL(preview);
                setPreview(null);
                onPick(null);
              }}
            >
              <Trash2 aria-hidden /> Quitar
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Opcional. Sale en tu carta de jugador.</p>
        {error && (
          <p role="alert" className="text-sm font-bold text-destructive">
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
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
