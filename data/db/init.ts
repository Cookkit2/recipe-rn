/**
 * Database Initialization
 *
 * This file handles database initialization and optional seeding for development.
 */

import { databaseFacade } from './DatabaseFacade';
import { log } from '~/utils/logger';

export async function initializeDatabase(
  options: {
    clearFirst?: boolean;
    logStats?: boolean;
  } = {}
) {
  const { clearFirst = false, logStats = true } = options;

  log.info('🍉 Initializing WatermelonDB...');

  try {
    // Check if database is healthy
    const isHealthy = await databaseFacade.isHealthy();
    if (!isHealthy) {
      throw new Error('Database is not healthy');
    }

    // Clear database if requested
    if (clearFirst) {
      log.info('🧹 Clearing database...');
      await databaseFacade.clearAllData();
    }

    // Check current stats
    const initialStats = await databaseFacade.getDatabaseStats();

    if (logStats) {
      log.info('📊 Initial database stats:', initialStats);
    }

    log.info('✅ Database initialization complete');
    return true;
  } catch (error) {
    log.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Development helper
export async function devInitialize() {
  return initializeDatabase({
    clearFirst: false,
    logStats: true,
  });
}

// Production helper
export async function prodInitialize() {
  return initializeDatabase({
    clearFirst: false,
    logStats: false,
  });
}
