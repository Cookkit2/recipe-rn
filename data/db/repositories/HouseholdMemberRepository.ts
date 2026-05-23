import { Q } from "@nozbe/watermelondb";
import HouseholdMember, { type HouseholdMemberData } from "../models/HouseholdMember";
import { BaseRepository } from "./BaseRepository";

export class HouseholdMemberRepository extends BaseRepository<HouseholdMember> {
  constructor() {
    super("household_member");
  }

  async findByHouseholdId(householdId: string): Promise<HouseholdMember[]> {
    return await this.collection.query(Q.where("household_id", householdId)).fetch();
  }

  async findByUserId(userId: string): Promise<HouseholdMember | null> {
    const results = await this.collection.query(Q.where("user_id", userId)).fetch();
    return results[0] ?? null;
  }

  async getMemberCount(householdId: string): Promise<number> {
    return await this.collection.query(Q.where("household_id", householdId)).fetchCount();
  }

  async addMember(data: HouseholdMemberData): Promise<HouseholdMember> {
    return await this.create({
      supabaseId: data.supabaseId,
      householdId: data.householdId,
      userId: data.userId,
      displayName: data.displayName,
    } as unknown as Partial<HouseholdMember> & Record<string, unknown>);
  }

  async removeByUserId(userId: string): Promise<void> {
    const member = await this.findByUserId(userId);
    if (member) {
      await this.delete(member.id);
    }
  }
}
