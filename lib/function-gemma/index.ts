/**
 * Function Gemma Integration - Exports
 */

export {
  FunctionGemmaService,
  FRIDGIT_TOOLS,
  MODEL_CONFIG,
  downloadModelIfNeeded,
  checkModelExists,
} from './FunctionGemmaService';

export type {
  FridgitTool,
  ToolCall,
  CompletionResult,
  ModelConfig,
  ToolExecutor,
} from './FunctionGemmaService';
