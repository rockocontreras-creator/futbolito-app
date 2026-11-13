import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage, LegalSection } from "@/components/layout/legal-page";
import { APP_NAME } from "@/config/site";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: `Las reglas para usar ${APP_NAME}.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Términos de uso" updated="13 de noviembre de 2026">
      <p>
        {APP_NAME} es una página gratuita para organizar partidos de futbolito entre vecinos. Al crear una
        cuenta aceptas estas reglas.
      </p>

      <LegalSection title="Tu cuenta">
        <ul>
          <li>Debes tener al menos 14 años.</li>
          <li>Usa tu nombre y un correo que sea tuyo. Una cuenta por persona.</li>
          <li>Cuida tu contraseña: lo que se haga con tu cuenta corre por tu cuenta.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Juego limpio">
        <ul>
          <li>Si te inscribes en un partido, ve. Si no puedes, bájate con tiempo.</li>
          <li>Reporta los resultados como fueron. Inventar resultados para subir de rango no vale.</li>
          <li>
            Nada de insultos, amenazas, discriminación ni acoso en la sala, los comentarios o la cancha.
          </li>
          <li>No publiques datos de otras personas sin su permiso.</li>
        </ul>
        <p>
          Quien administra la página puede borrar contenido y suspender cuentas que no respeten estas reglas.
        </p>
      </LegalSection>

      <LegalSection title="Los partidos son de quienes los organizan">
        <p>
          La página solo ayuda a coordinar. No arrienda canchas, no cobra ni maneja plata, y no responde por
          lesiones, pérdidas o problemas que ocurran en un partido. El costo que aparece en un partido lo fija
          y lo cobra quien lo organiza. Los menores de edad deben jugar con permiso de un adulto responsable.
        </p>
      </LegalSection>

      <LegalSection title="El servicio">
        <p>
          Hacemos lo posible para que la página funcione bien, pero puede fallar, cambiar o dejar de estar
          disponible. El pronóstico del tiempo y el rango son referencias, no garantías.
        </p>
      </LegalSection>

      <LegalSection title="Tus datos">
        <p>
          Qué guardamos y para qué está explicado en <Link href="/privacidad">Privacidad</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Contacto">
        <ContactLine />
      </LegalSection>
    </LegalPage>
  );
}
