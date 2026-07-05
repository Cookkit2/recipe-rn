import { cn } from "../utils";

describe("cn utility", () => {
  it("merges basic string classes", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("handles conditional classes", () => {
    expect(cn("class1", { class2: true, class3: false })).toBe("class1 class2");
  });

  it("handles arrays of classes", () => {
    expect(cn(["class1", "class2"], "class3")).toBe("class1 class2 class3");
  });

  it("handles undefined, null, and false", () => {
    expect(cn("class1", undefined, null, false, "class2")).toBe("class1 class2");
  });

  it("resolves Tailwind CSS conflicts", () => {
    // Tailwind specific merging (p-4 overrides p-2)
    expect(cn("p-2", "p-4")).toBe("p-4");

    // More specific overrides general
    expect(cn("p-4", "px-2")).toBe("p-4 px-2");
    expect(cn("px-2", "p-4")).toBe("p-4");

    // Colors
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("combines clsx features with twMerge features", () => {
    expect(cn("p-2 bg-red-500", { "p-4 bg-blue-500": true }, false && "text-white")).toBe(
      "p-4 bg-blue-500"
    );
  });
});
