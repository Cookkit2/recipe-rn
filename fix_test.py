import re

with open("data/services/__tests__/HouseholdSyncService.test.ts", "r") as f:
    content = f.read()

# Add a test specifically for the pull path N+1 fix
test_to_add = """
  it("queries stock by household_id in pullRemoteChanges (no fetch-all)", async () => {
    stockCollection.fetch.mockResolvedValueOnce([]);

    (householdApi.getSharedStock as jest.Mock).mockResolvedValueOnce([
      {
        id: "stock-1",
        name: "Milk",
        quantity: 2,
        unit: "carton",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ]);

    await (service as any).pullRemoteChanges("household-1");

    expect(stockCollection.query).toHaveBeenCalledTimes(1);
    const args = (stockCollection.query as jest.Mock).mock.calls[0] ?? [];
    expect(args[0]).toEqual({ col: "household_id", op: "household-1" });
    expect(Q.where).toHaveBeenCalledWith("household_id", "household-1");
  });

"""

content = content.replace('  it("preserves a fresher local edit', test_to_add + '  it("preserves a fresher local edit')

with open("data/services/__tests__/HouseholdSyncService.test.ts", "w") as f:
    f.write(content)
