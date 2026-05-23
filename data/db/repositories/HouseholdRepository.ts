import { Q } from "@nozbe/watermelondb";
import Household, { type HouseholdData } from "../models/Household";
import { BaseRepository } from "./BaseRepository";

export class HouseholdRepository extends BaseRepository<Household> {
  constructor() {
    super("household");
  }

  async findBySupabaseId(supabaseId: string): Promise<Household | null> {
    const results = await this.collection.query(Q.where("supabase_id", supabaseId)).fetch();
    return results[0] ?? null;
  }

  async findByInviteCode(code: string): Promise<Household | null> {
    const results = await this.collection.query(Q.where("invite_code", code)).fetch();
    return results[0] ?? null;
  }

  async createHousehold(data: HouseholdData): Promise<Household> {
    return await this.create({
      supabaseId: data.supabaseId,
      name: data.name,
      inviteCode: data.inviteCode,
      inviteExpiresAt: data.inviteExpiresAt,
      maxMembers: data.maxMembers,
      createdByUserId: data.createdByUserId,
    } as unknown as Partial<Household> & Record<string, unknown>);
  }

  async updateInviteCode(id: string, code: string, expiresAt: number): Promise<Household> {
    return await this.update(id, {
      inviteCode: code,
      inviteExpiresAt: expiresAt,
    } as unknown as Partial<Household> & Record<string, unknown>);
  }
}
