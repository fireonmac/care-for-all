import { defineConfig } from 'drizzle-kit';
import { getDatabaseConfig } from './src/env';

const database = getDatabaseConfig();
const local = database.url.startsWith('file:') || database.url === ':memory:';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  ...(local
    ? { dialect: 'sqlite', dbCredentials: { url: database.url } }
    : { dialect: 'turso', dbCredentials: database }),
});
