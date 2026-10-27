// L'intégration Neon de Vercel peut préfixer ses variables (ex. NEON_DATABASE_URL) :
// on accepte les noms les plus courants.
export function databaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_POSTGRES_URL ||
    undefined
  );
}
