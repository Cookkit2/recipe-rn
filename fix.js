const fs = require('fs');
let content = fs.readFileSync('lib/function-gemma/__tests__/FunctionGemmaService.test.ts', 'utf8');

content = content.replace(
  /import \{\s*FunctionGemmaService,\s*parseFunctionCalls,\s*ToolExecutor,?\s*\} from "\.\.\/FunctionGemmaService";/,
  'import { FunctionGemmaService, parseFunctionCalls, type ToolExecutor } from "../FunctionGemmaService";'
);

content = content.replace(
  'expect(result[0].arguments).toEqual({ name: "apple" });',
  'expect(result[0]?.arguments).toEqual({ name: "apple" });'
);

content = content.replace(
  'expect(result.tool_calls?.[0].function.name).toBe("add_item");',
  'expect(result.tool_calls?.[0]?.function.name).toBe("add_item");'
);

content = content.replace(
  'expect(result.tool_calls?.[0].function.arguments).toEqual({',
  'expect(result.tool_calls?.[0]?.function.arguments).toEqual({'
);

fs.writeFileSync('lib/function-gemma/__tests__/FunctionGemmaService.test.ts', content);
