// Main database exports
export { default as database, collections } from "./database";
export { default as schema } from "./schema";
export { default as migrations } from "./migrations";

// Model exports
export * from "./models";

// Repository exports
export * from "./repositories";

// Database facade
export { DatabaseFacade, databaseFacade } from "./DatabaseFacade";

// Default export is the database facade for convenience
export { databaseFacade as default } from "./DatabaseFacade";
