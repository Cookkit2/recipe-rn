import migrations from "../migrations";

describe("database migrations", () => {
  it("does not recreate tables that already exist in schema version 1", () => {
    const versionTwoMigration = migrations.sortedMigrations.find(
      (migration) => migration.toVersion === 2,
    );

    expect(versionTwoMigration).toBeDefined();

    const createdTables =
      versionTwoMigration?.steps
        .filter((step) => step.type === "create_table")
        .map((step) => step.schema.name) ?? [];

    expect(createdTables).not.toEqual(
      expect.arrayContaining([
        "recipe",
        "recipe_step",
        "recipe_ingredient",
        "steps_to_store",
        "stock",
        "ingredient_category",
        "ingredient_synonym",
        "stock_category",
        "cooking_history",
      ]),
    );
  });
});
