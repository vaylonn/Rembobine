import { redirect } from "next/navigation";

// « À suivre » fait désormais partie de l'accueil ; l'ancienne adresse y mène.
export default function UpNextPage() {
  redirect("/");
}
