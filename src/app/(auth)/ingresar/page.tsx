import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Ingresar" };

export default function SignInPage() {
  async function google() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  async function magicLink(formData: FormData) {
    "use server";
    await signIn("resend", { email: String(formData.get("email") ?? ""), redirectTo: "/" });
  }

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Ingresar</CardTitle>
        <CardDescription>Entra con Google o te mandamos un enlace a tu correo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={google}>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Continuar con Google
          </Button>
        </form>
        <form action={magicLink} className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tucorreo@ejemplo.cl"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button type="submit" size="lg" className="w-full">
            Enviarme el enlace
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
