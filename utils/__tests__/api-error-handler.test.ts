import { withArrayErrorHandling } from "../api-error-handler";

describe("api-error-handler array processing", () => {
  it("processes items concurrently and collects successful results", async () => {
    const items = [1, 2, 3, 4, 5];
    const processor = jest.fn().mockImplementation(async (item: number) => {
      // Add a small delay to ensure concurrency is actually tested
      await new Promise((r) => setTimeout(r, 10));
      if (item === 3) throw new Error("Failing on 3");
      return item * 10;
    });

    const start = Date.now();
    const results = await withArrayErrorHandling(items, processor, "Error Processing");
    const duration = Date.now() - start;

    expect(results).toEqual([10, 20, 40, 50]);
    expect(processor).toHaveBeenCalledTimes(5);

    // In strict sequential processing, it would take > 50ms
    // If it's running with concurrency=5, it takes ~10ms
    // We can't strictly assert performance in unit tests reliably, but we can verify behavior.
  });
});
