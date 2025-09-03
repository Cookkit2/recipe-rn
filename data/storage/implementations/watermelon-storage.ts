import { IStorage, StorageError, JSONSerializer } from "../types";
import { Database, Model } from "@nozbe/watermelondb";
import { field, date, writer } from "@nozbe/watermelondb/decorators";
import { appSchema, tableSchema } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { Platform } from "react-native";
import { Q } from "@nozbe/watermelondb";

// KeyValue model for storing key-value pairs
class KeyValue extends Model {
  static table = "key_values";

  @field("key") key!: string;
  @field("value") value!: string;
  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  @writer async updateValue(newValue: string): Promise<KeyValue> {
    return this.update((record) => {
      record.value = newValue;
    });
  }
}

// Schema for key-value storage
const keyValueSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "key_values",
      columns: [
        { name: "key", type: "string", isIndexed: true },
        { name: "value", type: "string" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});

export class WatermelonStorage implements IStorage {
  private database: Database;
  private collection: any;
  private serializer = new JSONSerializer();

  constructor(options?: { databaseName?: string }) {
    // Create adapter based on platform
    const adapter =
      Platform.OS === "web"
        ? new LokiJSAdapter({
            schema: keyValueSchema,
            useWebWorker: false,
            useIncrementalIndexedDB: true,
            dbName: options?.databaseName || "watermelon_storage",
          })
        : new SQLiteAdapter({
            schema: keyValueSchema,
            dbName: options?.databaseName || "watermelon_storage",
            jsi: true,
          });

    this.database = new Database({
      adapter,
      modelClasses: [KeyValue],
      actionsEnabled: true,
    });

    this.collection = this.database.collections.get("key_values");
  }

  // Sync methods (not recommended for WatermelonDB)
  get<T>(key: string): T | null {
    throw new Error(
      "WatermelonDB requires async operations. Use getAsync instead."
    );
  }

  set<T>(key: string, value: T): void {
    throw new Error(
      "WatermelonDB requires async operations. Use setAsync instead."
    );
  }

  getString(key: string): string | null {
    throw new Error(
      "WatermelonDB requires async operations. Use getAsync instead."
    );
  }

  setString(key: string, value: string): void {
    throw new Error(
      "WatermelonDB requires async operations. Use setAsync instead."
    );
  }

  delete(key: string): void {
    throw new Error(
      "WatermelonDB requires async operations. Use deleteAsync instead."
    );
  }

  contains(key: string): boolean {
    throw new Error(
      "WatermelonDB requires async operations. Use getAsync to check existence."
    );
  }

  clear(): void {
    throw new Error(
      "WatermelonDB requires async operations. Use clearAsync instead."
    );
  }

  // Async methods
  async getAsync<T>(key: string): Promise<T | null> {
    try {
      const records = await this.collection.query(Q.where("key", key)).fetch();

      if (records.length === 0) {
        return null;
      }

      return this.serializer.deserialize<T>(records[0].value);
    } catch (error) {
      if (error.message && error.message.includes("not found")) {
        return null;
      }
      throw new StorageError(
        `Failed to get key "${key}": ${error}`,
        "watermelon"
      );
    }
  }

  async setAsync<T>(key: string, value: T): Promise<void> {
    try {
      await this.database.action(async () => {
        const existing = await this.collection
          .query(Q.where("key", key))
          .fetch();

        const serializedValue = this.serializer.serialize(value);

        if (existing.length > 0) {
          // Update existing record
          await existing[0].updateValue(serializedValue);
        } else {
          // Create new record
          await this.collection.create((record: any) => {
            record.key = key;
            record.value = serializedValue;
          });
        }
      });
    } catch (error) {
      throw new StorageError(
        `Failed to set key "${key}": ${error}`,
        "watermelon"
      );
    }
  }

  async deleteAsync(key: string): Promise<void> {
    try {
      await this.database.action(async () => {
        const records = await this.collection
          .query(Q.where("key", key))
          .fetch();

        if (records.length > 0) {
          await records[0].destroyPermanently();
        }
      });
    } catch (error) {
      if (error.message && error.message.includes("not found")) {
        return; // Key doesn't exist, nothing to delete
      }
      throw new StorageError(
        `Failed to delete key "${key}": ${error}`,
        "watermelon"
      );
    }
  }

  async clearAsync(): Promise<void> {
    try {
      await this.database.action(async () => {
        const allRecords = await this.collection.query().fetch();
        await Promise.all(
          allRecords.map((record: any) => record.destroyPermanently())
        );
      });
    } catch (error) {
      throw new StorageError(`Failed to clear storage: ${error}`, "watermelon");
    }
  }

  async getAllKeysAsync(): Promise<string[]> {
    try {
      const records = await this.collection.query().fetch();
      return records.map((record: any) => record.key);
    } catch (error) {
      throw new StorageError(`Failed to get all keys: ${error}`, "watermelon");
    }
  }

  async getBatchAsync<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this.getAsync<T>(key);
    }
    return result;
  }

  async setBatchAsync<T>(data: Record<string, T>): Promise<void> {
    // Use WatermelonDB batch action for better performance
    for (const [key, value] of Object.entries(data)) {
      await this.setAsync(key, value);
    }
  }

  async deleteBatchAsync(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.deleteAsync(key);
    }
  }
}
