import { create } from "zustand";
import type Household from "~/data/db/models/Household";
import type HouseholdMember from "~/data/db/models/HouseholdMember";

interface HouseholdState {
  currentHousehold: Household | null;
  members: HouseholdMember[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  realtimeConnected: boolean;

  setCurrentHousehold: (household: Household | null) => void;
  setMembers: (members: HouseholdMember[]) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncedAt: (timestamp: number | null) => void;
  setSyncError: (error: string | null) => void;
  setRealtimeConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useHouseholdStore = create<HouseholdState>((set) => ({
  currentHousehold: null,
  members: [],
  isLoading: false,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  realtimeConnected: false,

  setCurrentHousehold: (household) => set({ currentHousehold: household }),
  setMembers: (members) => set({ members }),
  setLoading: (isLoading) => set({ isLoading }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setSyncError: (syncError) => set({ syncError }),
  setRealtimeConnected: (realtimeConnected) => set({ realtimeConnected }),
  reset: () =>
    set({
      currentHousehold: null,
      members: [],
      isLoading: false,
      isSyncing: false,
      lastSyncedAt: null,
      syncError: null,
      realtimeConnected: false,
    }),
}));
