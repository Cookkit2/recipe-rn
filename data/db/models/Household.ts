import { Model } from "@nozbe/watermelondb";
import { field, date, children } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type HouseholdMember from "./HouseholdMember";

export interface HouseholdData {
  supabaseId: string;
  name: string;
  inviteCode: string;
  inviteExpiresAt: number;
  maxMembers: number;
  createdByUserId: string;
}

export default class Household extends Model {
  static table = "household";
  static associations: Associations = {
    household_member: { type: "has_many", foreignKey: "household_id" },
  };

  @field("supabase_id") supabaseId!: string;
  @field("name") name!: string;
  @field("invite_code") inviteCode!: string;
  @field("invite_expires_at") inviteExpiresAt!: number;
  @field("max_members") maxMembers!: number;
  @field("created_by_user_id") createdByUserId!: string;

  @children("household_member") members!: import("@nozbe/watermelondb").Query<HouseholdMember>;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  get isInviteExpired(): boolean {
    return this.inviteExpiresAt < Date.now();
  }
}
