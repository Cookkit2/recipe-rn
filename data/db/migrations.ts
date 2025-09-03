import { schemaMigrations } from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
  migrations: [
    // We'll add migration definitions here when we need to modify the schema
    // For example:
    // {
    //   toVersion: 2,
    //   steps: [
    //     addColumns({
    //       table: 'recipes',
    //       columns: [
    //         { name: 'some_new_field', type: 'string', isOptional: true }
    //       ]
    //     })
    //   ]
    // }
  ],
});
