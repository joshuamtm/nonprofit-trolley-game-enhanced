import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './index';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();