import { performance } from "perf_hooks";
import { Q } from "@nozbe/watermelondb";
import { database } from "./data/db/database";
import { TailoredRecipeMappingRepository } from "./data/db/repositories/TailoredRecipeMappingRepository";

async function run() {
  const repo = new TailoredRecipeMappingRepository();
  const start = performance.now();
  await repo.findByBaseAndHash("base-1", "hash-1");
  const end = performance.now();
  console.log(`Execution time: ${end - start} ms`);
}

run();
