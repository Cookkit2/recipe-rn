import { cn } from "../utils";

describe("cn utility", () => {
  it("merges standard classes correctly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("handles conditional classes", () => {
    expect(cn("p-4", true && "bg-blue-500", false && "text-black")).toBe("p-4 bg-blue-500");
  });

  it("handles arrays and nested arrays", () => {
    expect(cn(["w-full", "h-full"], ["flex"])).toBe("w-full h-full flex");
  });

  it("resolves Tailwind class conflicts properly", () => {
    // twMerge behavior: later classes override earlier conflicting ones
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    expect(cn("px-2 py-1", "p-4")).toBe("p-4"); // p-4 overrides px and py
  });

  it("ignores falsy values correctly", () => {
    expect(cn("base-class", null, undefined, "", 0, false, "active-class")).toBe(
      "base-class active-class"
    );
  });

  it("works with objects mapping classes to booleans", () => {
    expect(
      cn("base", {
        "text-red-500": true,
        "bg-white": false,
        "p-4": true,
      })
    ).toBe("base text-red-500 p-4");
  });
});
