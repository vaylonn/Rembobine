import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rembobine",
  description: "Suivi de films et séries, avec des recommandations à ton goût.",
  applicationName: "Rembobine",
  // Plein écran une fois ajoutée à l'écran d'accueil sur iPhone.
  appleWebApp: { capable: true, title: "Rembobine", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#060608",
  // Laisse la page passer sous la barre d'état (encoche) en mode app installée.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
