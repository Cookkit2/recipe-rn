const { generateKeyPairSync, verify } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { Readable } = require("node:stream");
const path = require("node:path");
const braces = require("braces");
const forge = require("node-forge");
const { sprintf } = require("sprintf-js");
const fileType = require("file-type");
const Parser = require("stream-json/Parser");
const Assembler = require("stream-json/Assembler");
const Verifier = require("stream-json/utils/Verifier");
const uuid = require("uuid");
const fastUri = require("fast-uri");

describe("URI normalization security boundaries", () => {
  test.each(["%6Aavascript:alert(1)", "%u006Aavascript:alert(1)"])(
    "does not activate an encoded scheme in %s",
    (input) => {
      expect(fastUri.parse(input).error).toBeTruthy();
      expect(fastUri.normalize(input)).not.toBe("javascript:alert(1)");
    }
  );
  test.each(["../x", "a/../b"])("preserves relative-reference meaning for %s", (input) => {
    const base = "https://example.com/recipes/dinner/";
    expect(fastUri.resolve(base, fastUri.normalize(input))).toBe(fastUri.resolve(base, input));
  });
  test.each(["http://a@b@evil.example/", "http://e\tvil.example/", "http://e\nvil.example/"])(
    "rejects ambiguous HTTP authority %s",
    (input) => expect(fastUri.parse(input).error).toBeTruthy()
  );
  test("escapes a relative first-segment colon in suffix mode", () => {
    const output = fastUri.serialize({ path: "javascript:alert(1)" }, { reference: "suffix" });
    expect(fastUri.parse(output).scheme).toBeUndefined();
    expect(output).toContain("%3A");
  });
  test("preserves ordinary absolute URLs and distinct reference identities", () => {
    expect(fastUri.normalize("https://EXAMPLE.com/recipes/egg")).toBe(
      "https://example.com/recipes/egg"
    );
    expect(fastUri.equal("../x", "x")).toBe(false);
    expect(fastUri.equal("%68ttp://a/", "http://a/")).toBe(false);
  });
});

function collect(stream, input) {
  return new Promise((resolve, reject) => {
    const output = [];
    stream.on("data", (value) => output.push(value));
    stream.on("error", reject);
    stream.on("end", () => resolve(output));
    if (Array.isArray(input)) Readable.from(input).pipe(stream);
    else stream.end(input);
  });
}

function inChild(source, input) {
  const result = spawnSync(process.execPath, ["--max-old-space-size=128", "-e", source], {
    cwd: path.resolve(__dirname, "../.."),
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 3000,
    maxBuffer: 1024 * 1024,
  });
  expect({ error: result.error?.message, status: result.status, stderr: result.stderr }).toEqual({
    error: undefined,
    status: 0,
    stderr: "",
  });
}

describe("patched dependency security boundaries", () => {
  describe("braces", () => {
    test.each(["compile", "expand", "stringify", "parse"])(
      "%s rejects excessive brace and parenthesis nesting before recursion",
      (method) => {
        for (const [open, close] of [
          ["{", "}"],
          ["(", ")"],
        ]) {
          expect(() => braces[method](open.repeat(4000) + "a" + close.repeat(4000))).toThrow(
            /maximum brace nesting/i
          );
        }
      }
    );

    test.each(["compile", "expand", "stringify"])("%s also protects direct AST input", (method) => {
      let ast = { type: "text", value: "a" };
      for (let i = 0; i < 200; i++) ast = { type: "root", nodes: [ast] };
      expect(() => braces[method](ast)).toThrow(/maximum brace nesting/i);
      const cycle = { type: "root", nodes: [] };
      cycle.nodes.push(cycle);
      expect(() => braces[method](cycle)).toThrow(/maximum brace nesting/i);
      const iterableCycle = { type: "root", nodes: new Set() };
      iterableCycle.nodes.add(iterableCycle);
      expect(() => braces[method](iterableCycle)).toThrow(/nodes must be an array/);
    });

    test("preserves ordinary ranges, nested alternatives, and quoted/escaped literals", () => {
      expect(braces.expand("meal-{1..3}/{soup,{rice,pasta}}", { nodupes: true })).toHaveLength(9);
      expect(braces.compile("meal-{rice,pasta}")).toBe("meal-(rice|pasta)");
      expect(braces.stringify(braces.parse('"' + "{".repeat(200) + '"'))).toBe("{".repeat(200));
      expect(braces.expand("\\{soup\\}")).toEqual(["{soup}"]);
    });
  });

  describe("PKCS#1 v1.5 DigestInfo validation", () => {
    let privateKey;
    let publicKey;
    let nodePublicKey;
    const message = "Cookkit dependency regression";
    const digest = () => forge.md.sha256.create().update(message);
    const asn1 = forge.asn1;
    const item = (type, value, constructed = false) =>
      asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
    const nullParameter = () => item(asn1.Type.NULL, "");

    beforeAll(() => {
      const keys = generateKeyPairSync("rsa", { modulusLength: 1024, publicExponent: 3 });
      privateKey = forge.pki.privateKeyFromPem(
        keys.privateKey.export({ type: "pkcs1", format: "pem" })
      );
      publicKey = forge.pki.publicKeyFromPem(
        keys.publicKey.export({ type: "pkcs1", format: "pem" })
      );
      nodePublicKey = keys.publicKey;
    });

    function signature(parameters) {
      const algorithm = item(
        asn1.Type.SEQUENCE,
        [item(asn1.Type.OID, asn1.oidToDer(forge.oids.sha256).getBytes()), ...parameters],
        true
      );
      const info = item(
        asn1.Type.SEQUENCE,
        [algorithm, item(asn1.Type.OCTETSTRING, digest().digest().getBytes())],
        true
      );
      return privateKey.sign(asn1.toDer(info).getBytes(), "NONE");
    }

    test.each(["extra elements", "wrong parameter type", "nonempty NULL", "constructed NULL"])(
      "rejects %s inside the nested algorithm sequence",
      (variant) => {
        const parameters = {
          "extra elements": [nullParameter(), item(asn1.Type.OCTETSTRING, "garbage")],
          "wrong parameter type": [item(asn1.Type.OCTETSTRING, "garbage")],
          "nonempty NULL": [item(asn1.Type.NULL, "garbage")],
          "constructed NULL": [item(asn1.Type.NULL, [], true)],
        }[variant];
        const signed = signature(parameters);
        for (const options of [undefined, { _parseAllDigestBytes: false }]) {
          expect(() =>
            publicKey.verify(digest().digest().getBytes(), signed, undefined, options)
          ).toThrow(/DigestInfo/);
        }
      }
    );

    test("accepts SHA-256 identifiers with NULL or absent parameters", () => {
      for (const parameters of [[nullParameter()], []]) {
        expect(publicKey.verify(digest().digest().getBytes(), signature(parameters))).toBe(true);
      }
    });

    test("preserves standard signatures and Node crypto interoperability", () => {
      const signed = privateKey.sign(digest());
      expect(publicKey.verify(digest().digest().getBytes(), signed)).toBe(true);
      expect(
        verify("sha256", Buffer.from(message), nodePublicKey, Buffer.from(signed, "binary"))
      ).toBe(true);
      expect(
        publicKey.verify(forge.md.sha256.create().update("other").digest().getBytes(), signed)
      ).toBe(false);
    });
  });

  describe("sprintf", () => {
    test.each(["%1000000s", "%.1000000f", "%1000000j"])("rejects unbounded field %s", (format) => {
      expect(() => sprintf(format, 1)).toThrow(/maximum format field/i);
    });

    test("the exposed format API cannot bypass field limits", () => {
      const tree = sprintf.parse("%1000000s");
      expect(() => sprintf.format(tree, ["%1000000s", "x"])).toThrow(/maximum format field/i);
    });

    test("preserves named, padded numeric, and JSON formatting", () => {
      expect(sprintf("%(name)s: %(count)04d", { name: "Soup", count: 7 })).toBe("Soup: 0007");
      expect(sprintf("%.2f", 1.234)).toBe("1.23");
      expect(sprintf("%j", { food: "soup" })).toBe('{"food":"soup"}');
    });
  });

  describe("ASF detection", () => {
    test.each([0, 23, 9007199254740992])(
      "rejects a non-advancing or unsafe ASF object of size %d",
      (size) => {
        inChild(`
        const assert = require('node:assert/strict');
        const fileType = require('file-type');
        const b = Buffer.alloc(80);
        Buffer.from('3026b2758e66cf11a6d9', 'hex').copy(b);
        b.writeBigUInt64LE(BigInt(${size}), 46);
        assert.rejects(fileType.fromBuffer(b), /ASF.*size/i).catch(e => { console.error(e); process.exitCode = 1; });
      `);
      }
    );

    test("rejects a stream-property object too short for its type identifier", async () => {
      const b = Buffer.alloc(80);
      Buffer.from("3026b2758e66cf11a6d9", "hex").copy(b);
      Buffer.from("9107dcb7b7a9cf118ee600c00c205365", "hex").copy(b, 30);
      b.writeBigUInt64LE(24n, 46);
      await expect(fileType.fromBuffer(b)).rejects.toThrow(/ASF stream object size/);
    });

    test("still recognizes ASF audio and ordinary image files", async () => {
      const b = Buffer.alloc(70);
      Buffer.from("3026b2758e66cf11a6d9", "hex").copy(b);
      Buffer.from("9107dcb7b7a9cf118ee600c00c205365", "hex").copy(b, 30);
      b.writeBigUInt64LE(40n, 46);
      Buffer.from("409e69f84d5bcf11a8fd00805f5c442b", "hex").copy(b, 54);
      await expect(fileType.fromBuffer(b)).resolves.toEqual({ ext: "asf", mime: "audio/x-ms-asf" });
      await expect(fileType.fromBuffer(Buffer.from("GIF89a1234567890"))).resolves.toEqual({
        ext: "gif",
        mime: "image/gif",
      });
    });
  });

  describe("streaming JSON", () => {
    test.each([false, true])(
      "keeps __proto__ an own data property with reviver=%s",
      async (withReviver) => {
        const assembler = new Assembler(
          withReviver
            ? { reviver: (key, value) => (key === "drop" ? undefined : value) }
            : undefined
        );
        const input = '{"__proto__":{"admin":true},"constructor":{"safe":true},"drop":1}';
        for (const token of await collect(new Parser(), input)) assembler.consume(token);
        expect(Object.getPrototypeOf(assembler.current)).toBe(Object.prototype);
        expect(Object.hasOwn(assembler.current, "__proto__")).toBe(true);
        expect(assembler.current.__proto__).toEqual({ admin: true });
        expect(Object.hasOwn(assembler.current, "drop")).toBe(!withReviver);
      }
    );

    test("parser rejects excessive nesting", async () => {
      await expect(collect(new Parser(), "[".repeat(300) + "0" + "]".repeat(300))).rejects.toThrow(
        /maximum JSON nesting/i
      );
    });

    test.each(["Filter", "Pick", "Ignore", "Replace"])(
      "%s also bounds direct token input",
      async (name) => {
        const Filter = require(`stream-json/filters/${name}`);
        const tokens = [];
        for (let i = 0; i < 300; i++)
          tokens.push({ name: "startObject" }, { name: "keyValue", value: "k" });
        tokens.push({ name: "numberValue", value: "0" });
        for (let i = 0; i < 300; i++) tokens.push({ name: "endObject" });
        await expect(collect(new Filter({ filter: "missing" }), tokens)).rejects.toThrow(
          /maximum JSON nesting/i
        );
      }
    );

    test("preserves ordinary parsing and filtering", async () => {
      const Filter = require("stream-json/filters/Filter");
      const tokens = await collect(new Parser(), '{"food":{"name":"Soup"},"count":2}');
      const output = await collect(new Filter({ filter: /^food(?:\.|$)/ }), tokens);
      const assembler = new Assembler();
      output.forEach((token) => assembler.consume(token));
      expect(assembler.current).toEqual({ food: { name: "Soup" } });
    });

    test("the installed 1.x parser/verifier do not implement the affected JSONC feature", async () => {
      const input = '{/*comment*/"food":"Soup"}';
      await expect(
        collect(new Parser({ jsonc: true, allowComments: true }), input)
      ).rejects.toThrow();
      await expect(
        new Promise((resolve, reject) => {
          const verifier = new Verifier({ jsonc: true, allowComments: true });
          verifier.on("error", reject).on("finish", resolve).end(input);
        })
      ).rejects.toThrow();
    });
  });

  describe("UUID consumer compatibility", () => {
    test("rejects undersized and offset-overflow name-based UUID buffers", () => {
      for (const make of [uuid.v3, uuid.v5]) {
        expect(() => make("recipe", uuid.v5.DNS, Buffer.alloc(15))).toThrow();
        expect(() => make("recipe", uuid.v5.DNS, Buffer.alloc(16), 1)).toThrow();
      }
    });

    test("preserves RFC UUIDs and xcode project ID generation", () => {
      expect(uuid.v5("www.example.com", uuid.v5.DNS)).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
      const project = require("xcode").project(
        path.resolve(__dirname, "../../ios/Cookkit.xcodeproj/project.pbxproj")
      );
      project.parseSync();
      expect(project.generateUuid()).toMatch(/^[A-F0-9]{24}$/);
    });
  });
});
