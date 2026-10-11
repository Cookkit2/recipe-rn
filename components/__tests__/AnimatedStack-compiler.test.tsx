import { readFileSync } from "node:fs";
import path from "node:path";
import { transformSync } from "@babel/core";
import { Children, isValidElement, type ReactNode } from "react";
import { render } from "@testing-library/react-native";
import { View } from "react-native";

it("preserves screen definitions on repeated renders with React Compiler enabled", async () => {
  const root = path.resolve(__dirname, "../..");
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const compiler = require.resolve("babel-plugin-react-compiler", {
    paths: [path.dirname(require.resolve("babel-preset-expo/package.json"))],
  });
  const Screen = () => null;
  const observed: string[][] = [];
  const Stack = Object.assign(
    ({ children }: { children: ReactNode }) => {
      const elements = Children.toArray(children);
      if (
        !elements.length ||
        !elements.every((child) => isValidElement(child) && child.type === Screen)
      ) {
        throw new Error("Compiler produced invalid native stack children");
      }
      observed.push(
        elements.map((child) => (child as React.ReactElement<{ name: string }>).props.name)
      );
      return <View testID="compiled-stack" />;
    },
    { Screen }
  );
  const load = (filename: string): Record<string, unknown> => {
    const previous = cache.get(filename);
    if (previous) return previous.exports;
    const module = { exports: {} as Record<string, unknown> };
    cache.set(filename, module);
    const code = transformSync(readFileSync(filename, "utf8"), {
      filename,
      babelrc: false,
      configFile: false,
      plugins: [
        [compiler, { target: "19" }],
        ["@babel/plugin-transform-typescript", { isTSX: true }],
        ["@babel/plugin-transform-react-jsx", { runtime: "automatic" }],
        "@babel/plugin-transform-modules-commonjs",
      ],
    })?.code;
    if (!code) throw new Error("Missing compiled component");
    const resolve = (id: string): unknown => {
      if (id === "expo-router") return { Stack };
      if (id === "~/hooks/useColor")
        return { __esModule: true, default: () => ({ foreground: "black" }) };
      if (id === "~/hooks/useNotificationHandlers") return { useNotificationHandlers: () => {} };
      if (id === "~/hooks/useOnboardingCheck") return { useOnboardingCheck: () => {} };
      if (id === "~/components/ui/typography") return { H1: () => null };
      if (id.includes("AddToPlanHeaderButton") || id.includes("IngredientDeleteButton")) {
        return { __esModule: true, default: () => null };
      }
      if (id.startsWith("~/components/navigation/"))
        return load(path.join(root, id.slice(2) + ".tsx"));
      return require(id);
    };
    new Function("require", "module", "exports", code)(resolve, module, module.exports);
    return module.exports;
  };
  const { AnimatedStack } = load(path.join(root, "components/AnimatedStack.tsx")) as {
    AnimatedStack: () => React.ReactElement;
  };
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  let compilerErrors: unknown[][];
  try {
    const result = await render(<AnimatedStack />);
    await result.rerender(<AnimatedStack />);
    await result.rerender(<AnimatedStack />);
    compilerErrors = errorSpy.mock.calls.filter((args) => String(args[0]).includes("useMemoCache"));
  } finally {
    errorSpy.mockRestore();
  }
  expect(compilerErrors).toEqual([]);
  expect(observed.length).toBeGreaterThan(1);
  expect(
    observed.every(
      (names) => names.length > 5 && names.includes("index") && names.includes("(misc)/search")
    )
  ).toBe(true);
});
