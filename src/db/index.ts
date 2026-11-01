import { getDatabaseConfig } from '../env';
import { createLibsqlAdapter } from './adapters/libsql';

const adapter = createLibsqlAdapter(getDatabaseConfig());
export const db = adapter.db;
