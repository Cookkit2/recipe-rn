import { useHouseholdStore } from "../HouseholdStore";
import type Household from "~/data/db/models/Household";
import type HouseholdMember from "~/data/db/models/HouseholdMember";

describe("useHouseholdStore", () => {
  // Save the initial state to reset between tests
  const initialState = useHouseholdStore.getState();

  beforeEach(() => {
    // Reset store before each test
    useHouseholdStore.setState(initialState, true);
  });

  it("should have correct initial state", () => {
    const state = useHouseholdStore.getState();
    expect(state.currentHousehold).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isSyncing).toBe(false);
    expect(state.lastSyncedAt).toBeNull();
    expect(state.syncError).toBeNull();
    expect(state.realtimeConnected).toBe(false);
  });

  it("should set current household", () => {
    const mockHousehold = { id: "1", name: "My House" } as Household;
    useHouseholdStore.getState().setCurrentHousehold(mockHousehold);
    expect(useHouseholdStore.getState().currentHousehold).toEqual(mockHousehold);
  });

  it("should set members", () => {
    const mockMembers = [{ id: "1", userId: "u1" }] as HouseholdMember[];
    useHouseholdStore.getState().setMembers(mockMembers);
    expect(useHouseholdStore.getState().members).toEqual(mockMembers);
  });

  it("should set loading state", () => {
    useHouseholdStore.getState().setLoading(true);
    expect(useHouseholdStore.getState().isLoading).toBe(true);
  });

  it("should set syncing state", () => {
    useHouseholdStore.getState().setSyncing(true);
    expect(useHouseholdStore.getState().isSyncing).toBe(true);
  });

  it("should set last synced at timestamp", () => {
    const timestamp = Date.now();
    useHouseholdStore.getState().setLastSyncedAt(timestamp);
    expect(useHouseholdStore.getState().lastSyncedAt).toBe(timestamp);
  });

  it("should set sync error", () => {
    const error = "Network error";
    useHouseholdStore.getState().setSyncError(error);
    expect(useHouseholdStore.getState().syncError).toBe(error);
  });

  it("should set realtime connected state", () => {
    useHouseholdStore.getState().setRealtimeConnected(true);
    expect(useHouseholdStore.getState().realtimeConnected).toBe(true);
  });

  it("should reset all states", () => {
    // Set some state first
    useHouseholdStore.setState({
      currentHousehold: { id: "1", name: "My House" } as Household,
      members: [{ id: "1", userId: "u1" }] as HouseholdMember[],
      isLoading: true,
      isSyncing: true,
      lastSyncedAt: Date.now(),
      syncError: "error",
      realtimeConnected: true,
    });

    // Verify state was changed
    expect(useHouseholdStore.getState().isLoading).toBe(true);

    // Call reset
    useHouseholdStore.getState().reset();

    // Verify it's back to initial
    const state = useHouseholdStore.getState();
    expect(state.currentHousehold).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isSyncing).toBe(false);
    expect(state.lastSyncedAt).toBeNull();
    expect(state.syncError).toBeNull();
    expect(state.realtimeConnected).toBe(false);
  });
});
