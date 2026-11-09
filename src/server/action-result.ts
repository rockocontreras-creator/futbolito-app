import "server-only";
import { z } from "zod";
import { AuthError } from "./permissions";

// Respuesta tipada de toda Server Action (CLAUDE.md §8).
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Valida el input con Zod y ejecuta la acción, convirtiendo errores conocidos en
 * `{ ok: false }`. Errores inesperados se registran y se devuelve un mensaje genérico.
 */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  fn: (data: z.infer<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los campos marcados.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  try {
    return { ok: true, data: await fn(parsed.data) };
  } catch (e) {
    if (e instanceof AuthError) {
      const field = (e as AuthError & { field?: string }).field;
      return field
        ? { ok: false, error: e.message, fieldErrors: { [field]: [e.message] } }
        : { ok: false, error: e.message };
    }
    console.error(e);
    return { ok: false, error: "No pudimos guardar los cambios. Inténtalo de nuevo en un momento." };
  }
}
