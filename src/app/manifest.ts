import type { MetadataRoute } from "next";
import { APP_DESCRIPTION, APP_NAME } from "@/config/site";

// Manifest PWA (instalable). Los íconos se agregan cuando exista el logo definitivo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: "Futbolito",
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f7fbf8",
    theme_color: "#1f8a4c",
    lang: "es-CL",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
