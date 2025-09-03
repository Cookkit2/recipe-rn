import { Model } from "@nozbe/watermelondb";
import { field, date, writer } from "@nozbe/watermelondb/decorators";

export interface UserData {
  username: string;
  role: string;
  preferences?: Record<string, any>;
}

export default class User extends Model {
  static table = "users";

  @field("username") username!: string;
  @field("role") role!: string;
  @field("preferences") _preferences?: string; // JSON string

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for preferences
  get preferences(): Record<string, any> {
    return this._preferences ? JSON.parse(this._preferences) : {};
  }

  set preferences(value: Record<string, any>) {
    this._preferences = JSON.stringify(value);
  }

  // Helper method to get a specific preference
  getPreference<T>(key: string, defaultValue?: T): T {
    const prefs = this.preferences;
    return prefs[key] !== undefined ? prefs[key] : defaultValue;
  }

  // Helper method to set a specific preference
  @writer async setPreference(key: string, value: any): Promise<User> {
    return this.update((user) => {
      const prefs = user.preferences;
      prefs[key] = value;
      user.preferences = prefs;
    });
  }

  // Update method
  @writer async updateUser(data: Partial<UserData>): Promise<User> {
    return this.update((user) => {
      if (data.username !== undefined) user.username = data.username;
      if (data.role !== undefined) user.role = data.role;
      if (data.preferences !== undefined) user.preferences = data.preferences;
    });
  }
}
