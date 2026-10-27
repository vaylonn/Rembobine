"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ from }: { from?: string }) {
  const [error, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="depuis" value={from ?? "/"} />
      <input
        type="password"
        name="password"
        placeholder="Mot de passe"
        autoFocus
        required
        className="input"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Connexion…" : "Entrer"}
      </button>
    </form>
  );
}
