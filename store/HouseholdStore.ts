import { create } from "zustand";
import type Household from "~/data/db/models/Household";
import type HouseholdMember from "~/data/db/models/HouseholdMember";

interface HouseholdState {
  currentHousehold: Household | null;
  members: HouseholdMember[];
  isLoading: boolean;

  setCurrentHousehold: (household: Household | null) => void;
  setMembers: (members: HouseholdMember[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useHouseholdStore = create<HouseholdState>((set) => ({
  currentHousehold: null,
  members: [],
  isLoading: false,

  setCurrentHousehold: (household) => set({ currentHousehold: household }),
  setMembers: (members) => set({ members }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ currentHousehold: null, members: [], isLoading: false }),
}));
