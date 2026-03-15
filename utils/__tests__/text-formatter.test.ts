import { pluralize } from "../text-formatter";

describe("pluralize", () => {
  it("returns an empty string when given an empty word", () => {
    expect(pluralize("", 0)).toBe("");
    expect(pluralize("", 1)).toBe("");
    expect(pluralize("", 2)).toBe("");
  });

  it("returns the original word when count is 1", () => {
    expect(pluralize("apple", 1)).toBe("apple");
    expect(pluralize("child", 1)).toBe("child");
    expect(pluralize("berry", 1)).toBe("berry");
    expect(pluralize("bus", 1)).toBe("bus");
  });

  describe("irregular plurals", () => {
    it("handles common irregular plurals correctly", () => {
      expect(pluralize("child", 2)).toBe("children");
      expect(pluralize("person", 2)).toBe("people");
      expect(pluralize("man", 2)).toBe("men");
      expect(pluralize("woman", 2)).toBe("women");
      expect(pluralize("tooth", 2)).toBe("teeth");
      expect(pluralize("foot", 2)).toBe("feet");
      expect(pluralize("mouse", 2)).toBe("mice");
      expect(pluralize("goose", 2)).toBe("geese");
    });

    it("handles irregular plurals case-insensitively for the lookup", () => {
      expect(pluralize("Child", 2)).toBe("children");
      expect(pluralize("PERSON", 2)).toBe("people");
    });
  });

  describe("words ending in 'y'", () => {
    it("replaces 'y' with 'ies' if preceded by a consonant", () => {
      expect(pluralize("berry", 2)).toBe("berries");
      expect(pluralize("city", 2)).toBe("cities");
      expect(pluralize("puppy", 2)).toBe("puppies");
    });

    it("adds 's' if 'y' is preceded by a vowel", () => {
      expect(pluralize("boy", 2)).toBe("boys");
      expect(pluralize("day", 2)).toBe("days");
      expect(pluralize("monkey", 2)).toBe("monkeys");
    });
  });

  describe("words ending in s, sh, ch, x, z", () => {
    it("adds 'es' to words ending in 's'", () => {
      expect(pluralize("bus", 2)).toBe("buses");
      expect(pluralize("lens", 2)).toBe("lenses");
    });

    it("adds 'es' to words ending in 'sh'", () => {
      expect(pluralize("dish", 2)).toBe("dishes");
      expect(pluralize("wish", 2)).toBe("wishes");
    });

    it("adds 'es' to words ending in 'ch'", () => {
      expect(pluralize("church", 2)).toBe("churches");
      expect(pluralize("match", 2)).toBe("matches");
    });

    it("adds 'es' to words ending in 'x'", () => {
      expect(pluralize("box", 2)).toBe("boxes");
      expect(pluralize("fox", 2)).toBe("foxes");
    });

    it("adds 'es' to words ending in 'z'", () => {
      expect(pluralize("quiz", 2)).toBe("quizes");
      expect(pluralize("buzz", 2)).toBe("buzzes");
    });
  });

  describe("words ending in 'f' or 'fe'", () => {
    it("replaces 'f' with 'ves'", () => {
      expect(pluralize("half", 2)).toBe("halves");
      expect(pluralize("leaf", 2)).toBe("leaves");
      expect(pluralize("wolf", 2)).toBe("wolves");
    });

    it("replaces 'fe' with 'ves'", () => {
      expect(pluralize("knife", 2)).toBe("knives");
      expect(pluralize("life", 2)).toBe("lives");
      expect(pluralize("wife", 2)).toBe("wives");
    });
  });

  describe("regular plurals", () => {
    it("adds 's' to standard words", () => {
      expect(pluralize("cat", 2)).toBe("cats");
      expect(pluralize("dog", 2)).toBe("dogs");
      expect(pluralize("apple", 2)).toBe("apples");
      expect(pluralize("tree", 2)).toBe("trees");
    });
  });
});
