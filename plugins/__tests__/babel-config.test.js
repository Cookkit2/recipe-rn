const babel = require("@babel/core");
const path = require("path");
const vm = require("vm");
const config = require("../../babel.config")({ cache() {} });

it("preserves decorated database accessors when stripping definite-assignment types", () => {
  const source = `
    function field(target, key) {
      return {
        configurable: true,
        enumerable: true,
        get() { return this._raw[key]; },
        set(value) { this._raw[key] = value; }
      };
    }
    class Record {
      _raw = {};
      @field servings!: number;
    }
    const record = new Record();
    record.servings = 4;
    result = record._raw.servings;
  `;
  const output = babel.transformSync(source, {
    ...config,
    filename: path.resolve(__dirname, "../../data/db/models/Fixture.ts"),
    configFile: false,
    babelrc: false,
  });
  const context = { result: undefined, require };
  vm.runInNewContext(output.code, context);
  expect(context.result).toBe(4);
});

it("strips declare fields from dependency TypeScript without applying app decorators", () => {
  expect(() =>
    babel.transformSync("class NativeModule { declare name: string; }", {
      ...config,
      filename: path.resolve(__dirname, "../../node_modules/example/src/NativeModule.ts"),
      configFile: false,
      babelrc: false,
    })
  ).not.toThrow();
});

it("keeps screen-definition helpers outside React Compiler component caches", () => {
  for (const group of ["Pantry", "Ingredient", "Recipe", "Profile", "Misc"]) {
    const output = babel.transformFileSync(
      path.resolve(__dirname, `../../components/navigation/ScreenGroup${group}.tsx`),
      {
        ...config,
        configFile: false,
        babelrc: false,
        caller: {
          name: "metro",
          bundler: "metro",
          platform: "ios",
          isDev: true,
          supportsReactCompiler: true,
        },
      }
    );
    expect(output.code).not.toContain("react/compiler-runtime");
  }
});
