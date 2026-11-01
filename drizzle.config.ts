import { defineConfig } from 'drizzle-kit';
import { getDatabaseConfig, isLocalDatabaseUrl } from './src/env';

const database = getDatabaseConfig();
const local = isLocalDatabaseUrl(database.url);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  ...(local
    ? { dialect: 'sqlite', dbCredentials: { url: database.url } }
    : { dialect: 'turso', dbCredentials: database }),
});
