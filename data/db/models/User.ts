import { Model } from "@nozbe/watermelondb";
import { field, date, writer } from "@nozbe/watermelondb/decorators";

type PreferenceValue = string | number | boolean | null;
type Preferences = Record<string, PreferenceValue>;
export interface UserData {
  username: string;
  role: string;
  preferences?: Preferences;
}

export default class User extends Model {
  static table = "users";

  @field("username") username!: string;
  @field("role") role!: string;
  @field("preferences") _preferences?: string; // JSON string

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for preferences
  get preferences(): Preferences {
    return this._preferences ? JSON.parse(this._preferences) : {};
  }

  set preferences(value: Preferences) {
    this._preferences = JSON.stringify(value);
  }

  // Helper method to get a specific preference
  getPreference<T extends PreferenceValue>(key: string, defaultValue: T): T {
    const prefs = this.preferences;
    const value = prefs[key];
    return (value !== undefined ? value : defaultValue) as T;
  }

  // Helper method to set a specific preference
  @writer async setPreference(
    key: string,
    value: PreferenceValue
  ): Promise<User> {
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
