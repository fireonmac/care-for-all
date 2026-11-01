import { getDatabaseConfig } from '../env';
import { createDatabase } from './client';

export const db = createDatabase(getDatabaseConfig());
