/**
 * A/B experiment layer — bucketing + exposure measurement for the monetization
 * experiments #724 (trial length), #725 (paywall hardness), #731 (retention).
 *
 * See docs/EXPERIMENTS.md for usage.
 */

export {
  useExperiment,
  getExperimentAssignment,
  setExperimentAssignmentForTesting,
  resetExperimentAssignmentForTesting,
  type UseExperimentOptions,
  type UseExperimentResult,
} from "./useExperiment";

export { assignExperiment, hashStringToUint32 } from "./assignExperiment";
