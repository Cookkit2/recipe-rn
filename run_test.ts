import { splitTranscript } from './utils/pantry-voice-parser.ts';

const result = splitTranscript("and milk,");
if (JSON.stringify(result) !== '["milk"]') {
  console.error("Test failed, got: ", result);
  process.exit(1);
}

const result2 = splitTranscript("two eggs, milk and cheddar");
if (JSON.stringify(result2) !== '["two eggs","milk","cheddar"]') {
  console.error("Test failed, got: ", result2);
  process.exit(1);
}
console.log("Tests passed!");
