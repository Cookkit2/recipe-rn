import { StorageError, JSONSerializer } from "~/data/storage/types";

describe("Storage Types", () => {
  describe("StorageError", () => {
    it("should create error with storage type", () => {
      const error = new StorageError("Test error", "mmkv");

      expect(error.message).toBe("Test error");
      expect(error.storageType).toBe("mmkv");
      expect(error.name).toBe("StorageError");
      expect(error).toBeInstanceOf(Error);
    });

    it("should create error for different storage types", () => {
      const types: Array<Parameters<typeof StorageError>[1]> = [
        "mmkv",
        "sqlite",
        "watermelon",
        "realm",
        "async-storage",
      ];

      types.forEach((type) => {
        const error = new StorageError(`Error for ${type}`, type);
        expect(error.storageType).toBe(type);
      });
    });

    it("should be catchable as regular Error", () => {
      try {
        throw new StorageError("Test error", "mmkv");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(StorageError);
      }
    });

    it("should preserve stack trace", () => {
      const error = new StorageError("Test error", "mmkv");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("StorageError");
    });
  });

  describe("JSONSerializer", () => {
    let serializer: JSONSerializer<any>;

    beforeEach(() => {
      serializer = new JSONSerializer();
    });

    describe("serialize", () => {
      it("should serialize objects", () => {
        const data = { name: "John", age: 30 };
        const result = serializer.serialize(data);

        expect(result).toBe('{"name":"John","age":30}');
        expect(typeof result).toBe("string");
      });

      it("should serialize arrays", () => {
        const data = [1, 2, 3, "test"];
        const result = serializer.serialize(data);

        expect(result).toBe('[1,2,3,"test"]');
      });

      it("should serialize primitives", () => {
        expect(serializer.serialize(42)).toBe("42");
        expect(serializer.serialize("test")).toBe('"test"');
        expect(serializer.serialize(true)).toBe("true");
        expect(serializer.serialize(null)).toBe("null");
      });

      it("should serialize nested objects", () => {
        const data = {
          user: {
            profile: {
              name: "John",
              settings: {
                theme: "dark",
              },
            },
          },
        };

        const result = serializer.serialize(data);
        expect(typeof result).toBe("string");
        expect(JSON.parse(result)).toEqual(data);
      });

      it("should handle dates", () => {
        const date = new Date("2024-01-01T00:00:00.000Z");
        const result = serializer.serialize(date);

        expect(result).toBe('"2024-01-01T00:00:00.000Z"');
      });

      it("should handle undefined by converting to null", () => {
        const data = { value: undefined };
        const result = serializer.serialize(data);

        expect(result).toBe("{}"); // undefined properties are omitted in JSON
      });

      it("should throw on circular references", () => {
        const circular: any = { name: "test" };
        circular.self = circular;

        expect(() => serializer.serialize(circular)).toThrow();
      });

      it("should handle functions by omitting them", () => {
        const data = {
          name: "test",
          fn: () => "hello",
        };

        const result = serializer.serialize(data);
        expect(result).toBe('{"name":"test"}');
      });

      it("should handle symbols by omitting them", () => {
        const data = {
          name: "test",
          [Symbol("test")]: "symbol value",
        };

        const result = serializer.serialize(data);
        expect(result).toBe('{"name":"test"}');
      });
    });

    describe("deserialize", () => {
      it("should deserialize objects", () => {
        const json = '{"name":"John","age":30}';
        const result = serializer.deserialize(json);

        expect(result).toEqual({ name: "John", age: 30 });
      });

      it("should deserialize arrays", () => {
        const json = '[1,2,3,"test"]';
        const result = serializer.deserialize(json);

        expect(result).toEqual([1, 2, 3, "test"]);
      });

      it("should deserialize primitives", () => {
        expect(serializer.deserialize("42")).toBe(42);
        expect(serializer.deserialize('"test"')).toBe("test");
        expect(serializer.deserialize("true")).toBe(true);
        expect(serializer.deserialize("null")).toBe(null);
      });

      it("should deserialize nested objects", () => {
        const json =
          '{"user":{"profile":{"name":"John","settings":{"theme":"dark"}}}}';
        const result = serializer.deserialize(json);

        expect(result).toEqual({
          user: {
            profile: {
              name: "John",
              settings: {
                theme: "dark",
              },
            },
          },
        });
      });

      it("should handle date strings as strings", () => {
        const json = '"2024-01-01T00:00:00.000Z"';
        const result = serializer.deserialize(json);

        expect(result).toBe("2024-01-01T00:00:00.000Z");
        expect(typeof result).toBe("string");
      });

      it("should throw on invalid JSON", () => {
        expect(() => serializer.deserialize("invalid json")).toThrow(
          SyntaxError
        );
        expect(() => serializer.deserialize('{"incomplete":')).toThrow(
          SyntaxError
        );
        expect(() => serializer.deserialize("{trailing,}")).toThrow(
          SyntaxError
        );
      });

      it("should handle empty objects and arrays", () => {
        expect(serializer.deserialize("{}")).toEqual({});
        expect(serializer.deserialize("[]")).toEqual([]);
      });

      it("should handle whitespace", () => {
        const json = `  
          {
            "name": "John",
            "age": 30
          }
        `;
        const result = serializer.deserialize(json);

        expect(result).toEqual({ name: "John", age: 30 });
      });

      it("should handle unicode characters", () => {
        const json = '{"message":"Hello 世界 🌍"}';
        const result = serializer.deserialize(json);

        expect(result).toEqual({ message: "Hello 世界 🌍" });
      });

      it("should handle escaped characters", () => {
        const json = '{"text":"Line 1\\nLine 2\\tTabbed"}';
        const result = serializer.deserialize(json);

        expect(result).toEqual({ text: "Line 1\nLine 2\tTabbed" });
      });
    });

    describe("Round-trip serialization", () => {
      it("should maintain data integrity", () => {
        const originalData = {
          string: "test",
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: "value" },
        };

        const serialized = serializer.serialize(originalData);
        const deserialized = serializer.deserialize(serialized);

        expect(deserialized).toEqual(originalData);
      });

      it("should handle complex nested structures", () => {
        const originalData = {
          users: [
            {
              id: 1,
              profile: {
                name: "John",
                preferences: {
                  theme: "dark",
                  notifications: true,
                  tags: ["work", "personal"],
                },
              },
            },
            {
              id: 2,
              profile: {
                name: "Jane",
                preferences: {
                  theme: "light",
                  notifications: false,
                  tags: ["family"],
                },
              },
            },
          ],
          metadata: {
            version: "1.0",
            lastUpdated: "2024-01-01",
          },
        };

        const serialized = serializer.serialize(originalData);
        const deserialized = serializer.deserialize(serialized);

        expect(deserialized).toEqual(originalData);
      });

      it("should handle edge cases", () => {
        const edgeCases = [
          "",
          0,
          false,
          null,
          [],
          {},
          { "": "empty key" },
          { "special-chars": "!@#$%^&*()" },
          { numbers: [0, -1, 1.5, -1.5, Infinity, -Infinity] },
        ];

        edgeCases.forEach((data) => {
          if (typeof data === "object" && data !== null && "numbers" in data) {
            // Handle the special case with Infinity values
            const serialized = serializer.serialize(data);
            const deserialized = serializer.deserialize(serialized);

            // JSON converts Infinity to null
            const expectedData = {
              ...data,
              numbers: (data as any).numbers.map((n: any) =>
                n === Infinity || n === -Infinity ? null : n
              ),
            };
            expect(deserialized).toEqual(expectedData);
          } else {
            const serialized = serializer.serialize(data);
            const deserialized = serializer.deserialize(serialized);
            expect(deserialized).toEqual(data);
          }
        });
      });
    });

    describe("Type safety", () => {
      it("should work with generic types", () => {
        interface User {
          name: string;
          age: number;
        }

        const userSerializer = new JSONSerializer<User>();
        const user: User = { name: "John", age: 30 };

        const serialized = userSerializer.serialize(user);
        const deserialized = userSerializer.deserialize(serialized);

        expect(deserialized).toEqual(user);
        expect(deserialized.name).toBe("John");
        expect(deserialized.age).toBe(30);
      });

      it("should handle array types", () => {
        const arraySerializer = new JSONSerializer<string[]>();
        const data = ["a", "b", "c"];

        const serialized = arraySerializer.serialize(data);
        const deserialized = arraySerializer.deserialize(serialized);

        expect(deserialized).toEqual(data);
        expect(Array.isArray(deserialized)).toBe(true);
      });
    });
  });
});
