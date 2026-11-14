import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, LegalSection } from "@/components/layout/legal-page";
import { APP_NAME } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacidad",
  description: `Qué datos guarda ${APP_NAME}, para qué los usa y cómo pedir que se borren.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacidad" updated="14 de noviembre de 2026">
      <p>
        {APP_NAME} sirve para organizar partidos de futbolito en San Clemente. Acá explicamos, sin letra
        chica, qué datos guardamos, para qué y quién los ve.
      </p>

      <LegalSection title="Qué datos guardamos">
        <ul>
          <li>
            <strong>Tu cuenta:</strong> nombre y correo. Si entras con Google, recibimos de Google tu nombre,
            tu correo y tu foto; nada más. Si usas contraseña, se guarda cifrada y nadie puede leerla.
          </li>
          <li>
            <strong>Tu perfil de jugador:</strong> usuario, apodo, foto, fecha de nacimiento, posición, pie
            hábil, sector y, si quieres, género y teléfono.
          </li>
          <li>
            <strong>Lo que haces en la página:</strong> partidos que publicas o juegas, equipos, resultados,
            goles, rango, mensajes en la sala de un partido, comentarios en perfiles y valoraciones a otros
            jugadores.
          </li>
          <li>
            <strong>Avisos al celular:</strong> si los activas, guardamos la dirección técnica de ese
            dispositivo para poder mandártelos. Se borra cuando los desactivas.
          </li>
          <li>
            <strong>Reportes:</strong> si reportas a un jugador, guardamos el motivo y quién lo envió. Solo lo
            ven los administradores; la persona reportada no sabe quién fue.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Para qué los usamos">
        <ul>
          <li>Para que puedas entrar, sumarte a partidos y armar equipos.</li>
          <li>Para calcular tu rango, tus estadísticas y la clasificación.</li>
          <li>Para avisarte de cosas de tus partidos y mandarte el código que confirma tu correo.</li>
        </ul>
        <p>No vendemos tus datos, no mostramos publicidad y no te mandamos correos de promoción.</p>
      </LegalSection>

      <LegalSection title="Qué ven los demás">
        <ul>
          <li>
            <strong>Público:</strong> tu nombre, apodo, foto, edad, posición, rango, estadísticas y los
            comentarios de tu perfil.
          </li>
          <li>
            <strong>Tu teléfono:</strong> solo en “Se busca”, y solo entre quien publicó la búsqueda y las
            personas que aceptó para jugar.
          </li>
          <li>
            <strong>Tu correo y tu fecha de nacimiento:</strong> no se muestran a nadie.
          </li>
          <li>
            <strong>Valoraciones:</strong> quien las recibe no ve quién las hizo.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Menores de edad">
        <p>
          Hay que tener al menos 14 años para crear un perfil. A quienes tienen menos de 18 no se les muestra
          la edad exacta ni el teléfono a nadie.
        </p>
      </LegalSection>

      <LegalSection title="Servicios que usamos">
        <ul>
          <li>
            <strong>Supabase</strong> guarda la base de datos y las fotos de perfil.
          </li>
          <li>
            <strong>Vercel</strong> aloja la página.
          </li>
          <li>
            <strong>Google</strong> se usa para entrar con tu cuenta de Google y para enviar los correos con
            el código.
          </li>
          <li>
            <strong>OpenStreetMap y Open-Meteo</strong> muestran el mapa y el pronóstico. Reciben la ubicación
            de la cancha, no tus datos.
          </li>
        </ul>
        <p>Solo usamos la cookie necesaria para mantener tu sesión abierta. No hay cookies de seguimiento.</p>
      </LegalSection>

      <LegalSection title="Ver, corregir o borrar tus datos">
        <p>
          Puedes cambiar tu perfil cuando quieras en <Link href="/perfil/editar">Editar perfil</Link>. Si
          quieres una copia de tus datos o que borremos tu cuenta, pídelo y lo hacemos.
        </p>
        <ContactLine />
      </LegalSection>

      <LegalSection title="Cambios">
        <p>Si cambiamos algo importante de esta página, lo avisaremos en la app y actualizaremos la fecha.</p>
      </LegalSection>
    </LegalPage>
  );
}
