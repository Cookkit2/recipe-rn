import type { Recipe } from "~/types/Recipe";

export const dummyRecipesData: Recipe[] = [
  {
    id: "chicken-stir-fry",
    title: "Easy Chicken Stir-Fry",
    description:
      "A quick and healthy chicken stir-fry with fresh vegetables and a savory sauce.",
    imageUrl:
      "https://images.unsplash.com/photo-1621515554656-3da68ba128b1?q=80&w=3084&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepMinutes: 15,
    cookMinutes: 12,
    difficultyStars: 2,
    servings: 4,
    ingredients: [
      {
        name: "boneless, skinless chicken breasts",
        quantity: "1 lb",
        notes: "cut into 1-inch pieces",
        relatedIngredientId: "2",
      },
      { name: "soy sauce", quantity: "1/4 cup", relatedIngredientId: "9" },
      { name: "honey", quantity: "2 tablespoons", relatedIngredientId: "10" },
      {
        name: "sesame oil",
        quantity: "1 tablespoon",
        relatedIngredientId: "11",
      },
      {
        name: "cornstarch",
        quantity: "1 tablespoon",
        relatedIngredientId: "12",
      },
      {
        name: "olive oil",
        quantity: "1 tablespoon",
        relatedIngredientId: "13",
      },
      {
        name: "broccoli florets",
        quantity: "2 cups",
        relatedIngredientId: "14",
      },
      {
        name: "bell peppers",
        quantity: "1 cup",
        notes: "sliced (any color)",
        relatedIngredientId: "15",
      },
      {
        name: "carrots",
        quantity: "1 cup",
        notes: "julienned or thinly sliced",
        relatedIngredientId: "16",
      },
      {
        name: "garlic",
        quantity: "2 cloves",
        notes: "minced",
        relatedIngredientId: "17",
      },
      {
        name: "ginger",
        quantity: "1 teaspoon",
        notes: "grated",
        relatedIngredientId: "18",
      },
      {
        name: "cooked rice",
        quantity: "for serving",
        relatedIngredientId: "19",
      },
    ],
    instructions: [
      {
        step: 1,
        title: "Make the Sauce",
        description:
          "In a **small bowl**, whisk together **soy sauce**, **honey**, **sesame oil**, and **cornstarch** until smooth. Make sure no **cornstarch lumps** remain. **Set aside**.",
        relatedIngredientIds: ["1", "2"],
      },
      {
        step: 2,
        title: "Cook the Chicken",
        description:
          "Heat **15 mL olive oil** in a **large skillet or wok** over **medium-high heat**. Add **chicken** and cook for **5–7 minutes**, stirring occasionally, until **browned** and **fully cooked** (no pink in the center). Transfer chicken to a **plate** and **set aside**.",
        relatedIngredientIds: ["3", "4"],
      },
      {
        step: 3,
        title: "Stir-fry the Vegetables",
        description:
          "In the **same skillet**, add **broccoli**, **bell peppers**, and **carrots**. Stir-fry for **3–5 minutes** until **tender-crisp** but still **bright in color**.",
        relatedIngredientIds: ["5", "6"],
      },
      {
        step: 4,
        title: "Add Aromatics",
        description:
          "Add **garlic** and **ginger** to the vegetables. Cook for **1 minute** until **fragrant**, being careful **not to burn** them.",
        relatedIngredientIds: ["7", "8"],
      },
      {
        step: 5,
        title: "Combine Everything",
        description:
          "Return the **chicken** to the skillet. Pour the **prepared sauce** over everything. Cook, stirring constantly, for **2–3 minutes** until the **sauce thickens** and **coats the chicken and vegetables**.",
        relatedIngredientIds: ["9", "10", "11"],
      },
      {
        step: 6,
        title: "Serve",
        description:
          "**Serve immediately** over **cooked rice**. Optionally **garnish** with **sesame seeds** or **chopped green onions**.",
        relatedIngredientIds: [],
      },
    ],
    sourceUrl: "https://www.allrecipes.com/recipe/223382/chicken-stir-fry/",
    tags: ["main course", "asian", "healthy", "quick meal"],
    calories: 350,
  },
  {
    id: "caprese-salad",
    title: "Simple Caprese Salad",
    description:
      "A classic Italian salad featuring fresh mozzarella, tomatoes, and basil.",
    imageUrl:
      "https://images.unsplash.com/photo-1529312266912-b33cfce2eefd?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepMinutes: 10,
    cookMinutes: 0,
    difficultyStars: 1,
    servings: 4,
    ingredients: [
      {
        name: "ripe tomatoes",
        quantity: "2 large",
        notes: "sliced 1/4-inch thick",
        relatedIngredientId: "1",
      },
      {
        name: "fresh mozzarella cheese",
        quantity: "8 oz",
        notes: "sliced 1/4-inch thick",
        relatedIngredientId: "2",
      },
      {
        name: "fresh basil leaves",
        quantity: "1/4 cup",
        relatedIngredientId: "3",
      },
      {
        name: "extra-virgin olive oil",
        quantity: "2 tablespoons",
        relatedIngredientId: "4",
      },
      {
        name: "balsamic glaze",
        quantity: "1 tablespoon (optional)",
        relatedIngredientId: "5",
      },
      {
        name: "salt and freshly ground black pepper",
        quantity: "to taste",
        relatedIngredientId: "6",
      },
    ],
    instructions: [
      {
        step: 1,
        title: "Arrange the Ingredients",
        description:
          "Arrange alternating slices of **tomatoes** and **mozzarella** on a platter.",
        relatedIngredientIds: ["1", "2"],
      },
      {
        step: 2,
        title: "Add Basil",
        description:
          "Tuck **fresh basil leaves** in between the **tomato** and **mozzarella** slices.",
        relatedIngredientIds: ["3"],
      },
      {
        step: 3,
        title: "Drizzle with Oil",
        description:
          "Drizzle with **extra-virgin olive oil** and **balsamic glaze** (if using).",
        relatedIngredientIds: ["4", "5"],
      },
      {
        step: 4,
        title: "Season and Serve",
        description:
          "Season with **salt** and **pepper** to taste. **Serve immediately**.",
        relatedIngredientIds: ["6"],
      },
    ],
    sourceUrl:
      "https://www.foodnetwork.com/recipes/ina-garten/caprese-salad-recipe-1948534",
    tags: ["salad", "italian", "vegetarian", "gluten-free", "light meal"],
    calories: 280,
  },
  {
    id: "lemon-herb-roast-chicken",
    title: "Lemon Herb Roast Chicken",
    description:
      "A succulent and flavorful roast chicken seasoned with lemon and herbs, perfect for a family dinner.",
    imageUrl:
      "https://images.unsplash.com/photo-1597577652129-7ffad9d37ad4?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepMinutes: 20,
    cookMinutes: 90,
    difficultyStars: 3,
    servings: 4,
    ingredients: [
      {
        name: "whole chicken",
        quantity: "1 (3-4 lbs)",
        relatedIngredientId: "2",
      },
      {
        name: "lemon",
        quantity: "1",
        notes: "halved",
        relatedIngredientId: "3",
      },
      {
        name: "garlic",
        quantity: "4 cloves",
        notes: "smashed",
        relatedIngredientId: "4",
      },
      {
        name: "fresh rosemary sprigs",
        quantity: "3-4",
        relatedIngredientId: "5",
      },
      { name: "fresh thyme sprigs", quantity: "3-4", relatedIngredientId: "6" },
      {
        name: "olive oil",
        quantity: "2 tablespoons",
        relatedIngredientId: "7",
      },
      { name: "salt", quantity: "1 teaspoon", relatedIngredientId: "8" },
      {
        name: "black pepper",
        quantity: "1/2 teaspoon",
        relatedIngredientId: "9",
      },
      {
        name: "onion",
        quantity: "1",
        notes: "quartered (optional, for roasting pan)",
        relatedIngredientId: "10",
      },
      {
        name: "carrots",
        quantity: "2",
        notes: "roughly chopped (optional, for roasting pan)",
        relatedIngredientId: "11",
      },
    ],
    instructions: [
      {
        step: 1,
        title: "Preheat Oven",
        description:
          "Preheat oven to **425°F (220°C)**. Remove giblets from chicken cavity and pat the chicken dry with paper towels.",
        relatedIngredientIds: ["1", "2"],
      },
      {
        step: 2,
        title: "Season the Chicken",
        description:
          "Season the cavity of the chicken generously with **salt** and **pepper**. Stuff the cavity with **lemon halves**, **smashed garlic cloves**, **rosemary sprigs**, and **thyme sprigs**.",
        relatedIngredientIds: ["3", "4", "5", "6"],
      },
      {
        step: 3,
        title: "Rub with Oil",
        description:
          "Rub the outside of the chicken with **olive oil** and season generously with **salt** and **pepper**.",
        relatedIngredientIds: ["7", "8"],
      },
      {
        step: 4,
        title: "Roast the Chicken",
        description:
          "Place **onion** and **carrots** in the bottom of a roasting pan if desired. Place the chicken on top of the vegetables or directly in the pan.",
        relatedIngredientIds: ["9", "10"],
      },
      {
        step: 5,
        title: "Roast the Chicken",
        description:
          "Roast for 15 minutes at 425°F (220°C). Then, reduce the oven temperature to 375°F (190°C) and continue roasting for another 60-75 minutes, or until the internal temperature of the thickest part of the thigh reaches 165°F (74°C) and juices run clear.",
        relatedIngredientIds: [],
      },
      {
        step: 6,
        title: "Rest the Chicken",
        description:
          "Let the chicken rest for 10-15 minutes before carving. This allows the juices to redistribute, resulting in a more tender chicken.",
        relatedIngredientIds: [],
      },
    ],
    sourceUrl:
      "https://www.inspiredtaste.net/23801/easy-whole-roast-chicken-recipe/",
    tags: ["main course", "poultry", "roast", "comfort food", "gluten-free"],
    calories: 450,
  },
] as const;

// Helper function to get a recipe by ID
export const getRecipeById = (id: string): Recipe | undefined => {
  return dummyRecipesData.find((recipe) => recipe.id === id);
};
