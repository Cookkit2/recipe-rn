import { createFixtureSupabaseClient, startPostgrestFixture } from "../testing/postgrest-fixture";

it("serves the metadata lookup used by the real local pantry API", async () => {
  const fixture = await startPostgrestFixture({
    baseIngredients: [
      { id: "base-eggs", name: "eggs" },
      { id: "base-eggplant", name: "eggplant" },
    ],
  });
  try {
    const client = createFixtureSupabaseClient(fixture);
    const { data, error } = await client
      .from("base_ingredient")
      .select("*")
      .filter("name", "imatch", "\\Aeggs\\Z")
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ id: "base-eggs", name: "eggs" });
    const related = await Promise.all([
      client.from("ingredient_synonym").select("id, synonym").eq("base_ingredient_id", "base-eggs"),
      client
        .from("pivot_ingredient_category")
        .select("ingredient_category(id, name)")
        .eq("ingredient_id", "base-eggs"),
    ]);
    for (const result of related) {
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
    }
  } finally {
    await fixture.close();
  }
});
