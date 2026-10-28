describe.each(["deepmerge", "deepmerge/dist/umd.js"])("%s prototype safety", (entry) => {
  const merge = require(entry);
  const payload = () => JSON.parse('{"__proto__":{"admin":true}}');

  test.each([null, undefined, 0, "", Object.create(null)])(
    "keeps the returned prototype intact for target %p",
    (target) => {
      const result = merge(target, payload());
      expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
      expect(result.admin).toBeUndefined();
      expect({}.admin).toBeUndefined();
    }
  );

  test("safely copies an own __proto__ property from the target", () => {
    const result = merge(payload(), { name: "Cookkit" });
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.admin).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(result, "__proto__")).toEqual({
      value: { admin: true },
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  test("protects nested null placeholders, arrays and merge.all", () => {
    const result = merge({ session: null }, { session: payload() });
    expect(Object.getPrototypeOf(result.session)).toBe(Object.prototype);
    expect(result.session.admin).toBeUndefined();
    expect(merge([payload()], [])[0].admin).toBeUndefined();
    expect(merge.all([payload(), { name: "Cookkit" }]).admin).toBeUndefined();
  });

  test("preserves ordinary keys, symbols, custom merging and clone:false", () => {
    const symbol = Symbol("ingredient");
    const date = new Date(0);
    const result = merge(
      { nested: { count: 1 }, items: [1], label: { text: "egg" }, [symbol]: { fresh: true }, date },
      { nested: { unit: "piece" }, items: [2], label: { text: "rice" } },
      {
        customMerge: (key) =>
          key === "label" ? (a, b) => ({ text: `${a.text}/${b.text}` }) : undefined,
      }
    );
    expect(result).toEqual({
      nested: { count: 1, unit: "piece" },
      items: [1, 2],
      label: { text: "egg/rice" },
      [symbol]: { fresh: true },
      date,
    });
    const shared = { count: 1 };
    expect(merge({}, { shared }, { clone: false }).shared).toBe(shared);
  });
});
