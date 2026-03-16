## Memory/Pattern Notes

- When using WatermelonDB for bulk insertion/updates, `database.batch()` is heavily preferred over sequentially awaiting `.create()` calls inside of a loop. Replacing sequential insertions with batching dramatically drops the constant overhead of the SQLite transaction setup and proxying in JS.
