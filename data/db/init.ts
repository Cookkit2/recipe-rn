/**
 * Database Initialization
 *
 * This file handles database initialization and optional seeding for development.
 */

import { log } from "~/utils/logger";
import { databaseFacade } from "./DatabaseFacade";
import { seedDatabase } from "./seed";

export async function initializeDatabase(
  options: {
    autoSeed?: boolean;
    clearFirst?: boolean;
    logStats?: boolean;
  } = {}
) {
  const { autoSeed = false, clearFirst = false, logStats = true } = options;

  log.info("🍉 Initializing WatermelonDB...");

  try {
    // Check if database is healthy
    const isHealthy = await databaseFacade.isHealthy();
    if (!isHealthy) {
      throw new Error("Database is not healthy");
    }

    // Clear database if requested
    if (clearFirst) {
      log.info("🧹 Clearing database...");
      await databaseFacade.clearAllData();
    }

    // Check current stats
    const initialStats = await databaseFacade.getDatabaseStats();

    if (logStats) {
      log.info("📊 Initial database stats:", initialStats);
    }

    // Auto-seed if requested and database is empty
    if (autoSeed && initialStats.totalRecords === 0) {
      log.info("🌱 Auto-seeding database...");
      await seedDatabase();

      if (logStats) {
        const finalStats = await databaseFacade.getDatabaseStats();
        log.info("📈 Post-seed database stats:", finalStats);
      }
    }

    log.info("✅ Database initialization complete");
    return true;
  } catch (error) {
    log.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Development helper
export async function devInitialize() {
  return initializeDatabase({
    autoSeed: true,
    clearFirst: false,
    logStats: true,
  });
}

// Production helper
export async function prodInitialize() {
  return initializeDatabase({
    autoSeed: false,
    clearFirst: false,
    logStats: false,
  });
}
