import { Model } from "@nozbe/watermelondb";
import { field, date, relation } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Household from "./Household";

export interface HouseholdMemberData {
  supabaseId: string;
  householdId: string;
  userId: string;
  displayName?: string;
}

export default class HouseholdMember extends Model {
  static table = "household_member";
  static associations: Associations = {
    household: { type: "belongs_to", key: "household_id" },
  };

  @field("supabase_id") supabaseId!: string;
  @field("household_id") householdId!: string;
  @field("user_id") userId!: string;
  @field("display_name") displayName?: string;

  @relation("household", "household_id") household!: Household;

  @date("joined_at") joinedAt!: Date;
}
