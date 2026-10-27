import type { MetadataRoute } from "next";

// Rend l'app installable sur l'écran d'accueil du téléphone (PWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rembobine",
    short_name: "Rembobine",
    description: "Suivi de films et séries, avec des recommandations à ton goût.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060608",
    theme_color: "#060608",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Le dessin tient dans la zone sûre : la même image sert pour les icônes découpées (Android).
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
