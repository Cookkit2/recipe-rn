import { isIngredientMatch } from '../ingredient-matching';

describe('isIngredientMatch', () => {
  describe('Stage 0: Empty-name guard', () => {
    it('returns true if both names are empty', () => {
      expect(isIngredientMatch('', '')).toBe(true);
      expect(isIngredientMatch('   ', ' ')).toBe(true);
    });

    it('returns false if only one name is empty', () => {
      expect(isIngredientMatch('Chicken', '')).toBe(false);
      expect(isIngredientMatch('', 'Chicken')).toBe(false);
    });
  });

  describe('Stage 1: Direct name or substring match', () => {
    it('matches exact strings (case-insensitive)', () => {
      expect(isIngredientMatch('Chicken Breast', 'chicken breast')).toBe(true);
      expect(isIngredientMatch('MILK', 'milk')).toBe(true);
    });

    it('matches when pantry name contains recipe name', () => {
      expect(isIngredientMatch('Whole Milk', 'Milk')).toBe(true);
      expect(isIngredientMatch('Chicken Breast', 'Chicken')).toBe(true);
    });

    it('matches when recipe name contains pantry name', () => {
      expect(isIngredientMatch('Milk', 'Whole Milk')).toBe(true);
      expect(isIngredientMatch('Chicken', 'Chicken Breast')).toBe(true);
    });
  });

  describe('Stage 2: Provided synonyms (from database)', () => {
    it('matches when a string synonym matches the recipe name exactly', () => {
      expect(isIngredientMatch('Milk', 'whole milk', ['skim milk', 'whole milk'])).toBe(true);
    });

    it('matches when a string synonym contains the recipe name', () => {
      expect(isIngredientMatch('Milk', 'milk', ['whole milk'])).toBe(true);
    });

    it('matches when the recipe name contains a string synonym', () => {
      expect(isIngredientMatch('Milk', 'organic whole milk', ['whole milk'])).toBe(true);
    });

    it('matches when an object synonym matches the recipe name', () => {
      expect(isIngredientMatch('Milk', 'whole milk', [{ synonym: 'skim milk' }, { synonym: 'whole milk' }])).toBe(true);
    });

    it('returns false when no synonyms match', () => {
      // 'almond milk' matches 'milk' due to stage 1 substring match, let's use a better example for stage 2 failure
      expect(isIngredientMatch('Apple', 'Banana', ['Green Apple', 'Red Apple'])).toBe(false);
    });
  });

  describe('Stage 3: Keyword extraction and matching', () => {
    it('matches by ignoring stop words (modifiers)', () => {
      // 'fresh', 'diced', 'canned' are all stop words
      expect(isIngredientMatch('fresh diced tomatoes', 'canned tomatoes')).toBe(true);
      expect(isIngredientMatch('frozen chopped chicken', 'cooked chicken')).toBe(true);
    });

    it('ignores short words (length <= 2)', () => {
      // 'a', 'of' should be ignored
      expect(isIngredientMatch('a can of beans', 'beans')).toBe(true);
    });

    it('returns false when extracted keywords do not match', () => {
      expect(isIngredientMatch('fresh diced tomatoes', 'fresh chopped onions')).toBe(false);
    });
  });

  describe('Stage 4: Built-in synonym map', () => {
    it('matches cross-references within the same category', () => {
      // Pantry: "jasmine rice" -> contains synonym "jasmine rice" (rice category)
      // Recipe: "steamed rice" -> contains synonym "steamed rice" (rice category)
      expect(isIngredientMatch('jasmine rice', 'steamed rice')).toBe(true);

      // Pantry: "ground beef" -> contains synonym "ground beef" (beef category)
      // Recipe: "beef steak" -> contains synonym "beef steak" (beef category)
      expect(isIngredientMatch('ground beef', 'beef steak')).toBe(true);
    });

    it('matches base word to synonym within category', () => {
      // Pantry: "rice" -> contains baseWord "rice"
      // Recipe: "basmati rice" -> contains synonym "basmati rice"
      expect(isIngredientMatch('rice', 'basmati rice')).toBe(true);

      // Pantry: "chicken thigh" -> contains synonym "chicken thigh"
      // Recipe: "chicken" -> contains baseWord "chicken"
      expect(isIngredientMatch('chicken thigh', 'chicken')).toBe(true);
    });

    it('returns false for unrelated items even if they share stop words', () => {
      expect(isIngredientMatch('fresh chicken', 'fresh beef')).toBe(false);
      expect(isIngredientMatch('frozen peas', 'frozen corn')).toBe(false);
    });
  });
});
