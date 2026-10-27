import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · Rembobine" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/connexion">) {
  const { depuis } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rembobine</h1>
        <p className="mt-1 text-muted">Tes films et séries, rien qu&apos;à toi.</p>
      </div>
      <LoginForm from={typeof depuis === "string" ? depuis : undefined} />
    </main>
  );
}
