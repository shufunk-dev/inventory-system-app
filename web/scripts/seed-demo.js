import { seedDemoData } from '../lib/seedDemoData.js';

try {
  seedDemoData();
  process.exit(0);
} catch (error) {
  console.error('[Seed] Error during seeding:', error);
  process.exit(1);
}
