const { spawnSync } = require("node:child_process");
const path = require("node:path");

const entries = ["zod", "zod/v3", "zod/v4", "zod/v4/mini", "zod/v4-mini"];

test.each(
  entries.flatMap((entry) => [
    [entry, false],
    [entry, true],
  ])
)("%s (source=%s) bounds collection validation and preserves valid transforms", (entry, source) => {
  const specifier = source
    ? path.join(
        path.dirname(require.resolve("zod/package.json")),
        "src",
        entry === "zod" ? "index.ts" : entry.slice(4) + "/index.ts"
      )
    : entry;
  const child = spawnSync(
    source ? "bun" : process.execPath,
    [
      ...(source ? ["--eval"] : ["--max-old-space-size=128", "--input-type=module", "-e"]),
      `
      import assert from 'node:assert/strict';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      for (const z of [require(${JSON.stringify(specifier)}), await import(${JSON.stringify(specifier)})]) {
        const v3 = !${JSON.stringify(entry)}.includes('/v4');
        let visits = 0;
        const element = v3 ? z.preprocess(value => { visits++; return value; }, z.string())
          : z.pipe(z.transform(value => { visits++; return value; }), z.string());
        const limit = (schema, kind, exact = false) => v3
          ? exact ? (kind === 'array' ? schema.length(1) : schema.size(1)) : schema.max(1)
          : schema.check(kind === 'array' ? exact ? z.length(1) : z.maxLength(1) : exact ? z.size(1) : z.maxSize(1));
        const containers = [
          [() => z.array(element), 'array', Array(50000).fill(1)],
          [() => z.set(element), 'set', new Set(Array.from({length: 50000}, (_, i) => i))],
          ...(!v3 ? [[() => z.map(element, element), 'map', new Map(Array.from({length: 50000}, (_, i) => [i, i]))]] : []),
        ];
        for (const [make, kind, input] of containers) {
          for (const exact of [false, true]) {
            const schema = limit(make(), kind, exact);
            for (const async of [false, true]) {
              visits = 0;
              const result = async ? await schema.safeParseAsync(input) : schema.safeParse(input);
              assert.equal(result.success, false);
              assert.ok(v3 ? visits === 0 : visits <= 256, kind + ' exceeded validation work budget');
              assert.ok(result.error.issues.length <= 101);
              if (v3) assert.equal(result.error.issues[0].code, 'too_big');
            }
          }
        }
        const unbounded = [...containers, ...(v3 ? [[() => z.map(element, element), 'map', new Map(Array.from({length: 50000}, (_, i) => [i, i]))]] : [])];
        for (const [make, kind, input] of unbounded) {
          for (const async of [false, true]) {
            visits = 0;
            const schema = make();
            const result = async ? await schema.safeParseAsync(input) : schema.safeParse(input);
            assert.equal(result.success, false);
            assert.ok(result.error.issues.length <= 132, kind + ' produced unbounded diagnostics');
            assert.ok(visits <= 256, kind + ' parsed too many invalid children');
          }
        }
        // Ordinary bounded transforms, nested objects, and minimum errors still work.
        const valid = limit(z.array(element), 'array');
        assert.deepEqual(z.parse ? z.parse(valid, ['rice']) : valid.parse(['rice']), ['rice']);
        const object = z.object({ ingredients: valid });
        const parse = value => z.safeParse ? z.safeParse(object, value) : object.safeParse(value);
        visits = 0;
        const nested = parse({ingredients: ['rice', 'egg']});
        assert.equal(nested.success, false);
        assert.equal(visits, v3 ? 0 : 2);
        assert.deepEqual(nested.error.issues[0].path, ['ingredients']);
        const custom = v3 ? z.array(z.string()).max(1, 'Only one item') : z.array(z.string()).check(z.maxLength(1, {error: 'Only one item'}));
        const customResult = z.safeParse ? z.safeParse(custom, ['a', 'b']) : custom.safeParse(['a', 'b']);
        assert.equal(customResult.error.issues[0].message, 'Only one item');
        const asyncCheck = async () => { visits++; return true; };
        const asyncElement = v3 ? z.string().refine(asyncCheck) : z.string().check(z.refine(asyncCheck));
        const asyncSchema = limit(z.array(asyncElement), 'array');
        visits = 0;
        const oversizedAsync = z.safeParseAsync ? await z.safeParseAsync(asyncSchema, ['a', 'b']) : await asyncSchema.safeParseAsync(['a', 'b']);
        assert.equal(oversizedAsync.success, false);
        assert.equal(visits, v3 ? 0 : 2);
        visits = 0;
        const validAsync = z.safeParseAsync ? await z.safeParseAsync(asyncSchema, ['a']) : await asyncSchema.safeParseAsync(['a']);
        assert.equal(validAsync.success, true);
        assert.equal(visits, 1);
        const minimum = v3 ? z.array(z.string()).min(2) : z.array(z.string()).check(z.minLength(2));
        const tooSmall = z.safeParse ? z.safeParse(minimum, []) : minimum.safeParse([]);
        assert.equal(tooSmall.error.issues[0].code, 'too_small');
        if (!v3) {
          for (const jitless of [true, false]) {
            visits = 0;
            assert.equal(z.safeParse(object, {ingredients: ['rice', 'egg']}, {jitless}).success, false);
            assert.equal(visits, 2);
          }
          const beforeCatch = z.array(z.string()).check(z.maxLength(1));
          const caught = (beforeCatch.catch ? beforeCatch.catch([]) : z.catch(beforeCatch, [])).check(z.refine(value => value.length > 0));
          for (const input of [['a', 'b'], Array(50000).fill(1)]) {
            assert.equal(z.safeParse(caught, input).success, false);
            assert.equal((await z.safeParseAsync(caught, input)).success, false);
          }
          const conditional = z.array(z.coerce.string()).check(z.maxLength(1, {when: ({value}) => value.every(x => x.startsWith('1'))}));
          assert.equal(z.safeParse(conditional, [11, 12]).error.issues[0].code, 'too_big');
          const outputCondition = z.array(z.coerce.number()).check(z.maxLength(1, {when: ({value}) => value.every(x => typeof x === 'string')}));
          assert.equal(z.safeParse(outputCondition, ['1', '2']).success, true);
          const same = z.pipe(z.string(), z.transform(() => 'same'));
          assert.equal(z.parse(z.set(same).check(z.maxSize(1)), new Set(['rice', 'egg'])).size, 1);
          assert.equal(z.parse(z.map(same, z.string()).check(z.maxSize(1)), new Map([['rice', 'a'], ['egg', 'b']])).size, 1);
          visits = 0;
          const preceding = z.array(element).check(z.refine(() => true), z.maxLength(1));
          const manyErrors = z.safeParse(preceding, Array(50000).fill(1));
          assert.equal(manyErrors.success, false);
          assert.ok(manyErrors.error.issues.length <= 101);
          assert.ok(visits <= 132);
          let asyncVisits = 0;
          const asyncInvalid = z.pipe(z.transform(async value => { asyncVisits++; return value; }), z.string());
          const asyncErrors = await z.safeParseAsync(z.array(asyncInvalid).check(z.maxLength(1)), Array(50000).fill(1));
          assert.equal(asyncErrors.success, false);
          assert.ok(asyncErrors.error.issues.length <= 101);
          assert.ok(asyncVisits <= 132);
          // A prior overwrite can shrink input; it must run before a later size check.
          const rewrite = z.array(z.string()).check(z.overwrite(value => value.slice(0, 1)), z.maxLength(1));
          assert.deepEqual(z.parse(rewrite, ['rice', 'egg']), ['rice']);
          const disabled = z.maxLength(1, {when: () => false});
          assert.deepEqual(z.parse(z.array(z.string()).check(disabled), ['rice', 'egg']), ['rice', 'egg']);
        }
      }
    `,
    ],
    { cwd: path.resolve(__dirname, "../.."), encoding: "utf8", timeout: 10000 }
  );
  expect({ status: child.status, error: child.error?.message, stderr: child.stderr }).toEqual({
    status: 0,
    error: undefined,
    stderr: "",
  });
});
