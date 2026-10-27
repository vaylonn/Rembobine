import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/lib/database-url.mjs";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() ?? "" },
});
