import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { databaseUrl } from "./database-url.mjs";
import * as schema from "./schema";

let instance: NeonHttpDatabase<typeof schema> | undefined;

export function db() {
  if (!instance) {
    const url = databaseUrl();
    if (!url) throw new Error("Aucune URL de base de données (DATABASE_URL) n'est définie.");
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}
