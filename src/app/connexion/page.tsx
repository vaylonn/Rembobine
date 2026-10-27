import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion · Rembobine" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/connexion">) {
  const { depuis } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[120px]"
      />
      <div className="relative w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-surface/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-3 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent text-lg text-accent-fg">◀◀</span>
          <h1 className="font-display text-3xl font-bold tracking-tight">Rembobine</h1>
          <p className="text-sm text-muted">Tes films et séries, rien qu&apos;à toi.</p>
        </div>
        <LoginForm from={typeof depuis === "string" ? depuis : undefined} />
      </div>
    </main>
  );
}
