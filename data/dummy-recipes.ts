export interface RecipeIngredient {
  name: string;
  quantity: string;
  notes?: string;
}

export interface RecipeStep {
  stepNumber: number;
  description: string;
  imageUrl?: string; // Optional image for a specific step
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl?: string; // Main image for the recipe
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[]; // Changed from string[] to RecipeStep[]
  sourceUrl?: string;
  calories?: number; // Added from previous recipe list example
  tags?: string[];
}

export const dummyRecipesData: Recipe[] = [
  {
    id: "homemade-brownies",
    title: "Best Homemade Brownies",
    description:
      "With crispy edges, fudgy middles, and rich chocolate flavor, these homemade brownies will disappear in no time.",
    imageUrl:
      "https://images.unsplash.com/photo-1636743715220-d8f8dd900b87?q=80&w=3085&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepTime: "5 minutes",
    cookTime: "40-45 minutes",
    servings: 16,
    ingredients: [
      { name: "granulated sugar", quantity: "1 1/2 cups" },
      { name: "all-purpose flour", quantity: "3/4 cup" },
      {
        name: "cocoa powder",
        quantity: "2/3 cup",
        notes:
          "sifted if lumpy (e.g., Hershey's Special Dark Dutch-processed or Whole Foods' 365 Cocoa Powder)",
      },
      { name: "powdered sugar", quantity: "1/2 cup", notes: "sifted if lumpy" },
      {
        name: "dark chocolate chips",
        quantity: "1/2 cup",
        notes:
          "good quality, e.g., Ghiradelli's 60% Cacao or Enjoy Life's Dark Chocolate Morsels",
      },
      { name: "sea salt", quantity: "3/4 teaspoons" },
      { name: "large eggs", quantity: "2" },
      { name: "canola oil or extra-virgin olive oil", quantity: "1/2 cup" },
      { name: "water", quantity: "2 tablespoons" },
      { name: "vanilla extract", quantity: "1/2 teaspoon" },
    ],
    instructions: [
      {
        stepNumber: 1,
        description:
          "Preheat the oven to 325°F (160°C). Lightly spray an 8x8 inch baking dish with cooking spray and line it with parchment paper. Spray the parchment paper.",
        // imageUrl: "/placeholders/brownie-step1.jpg" // Example for step-specific image
      },
      {
        stepNumber: 2,
        description:
          "In a medium bowl, combine the sugar, flour, cocoa powder, powdered sugar, chocolate chips, and salt.",
      },
      {
        stepNumber: 3,
        description:
          "In a large bowl, whisk together the eggs, olive oil (or canola oil), water, and vanilla.",
      },
      {
        stepNumber: 4,
        description:
          "Sprinkle the dry mixture over the wet one, and fold until just combined. The batter will be thick!",
      },
      {
        stepNumber: 5,
        description:
          "Pour the batter into the prepared baking pan. Use a rubber spatula to spread it to all four sides of the pan and to smooth the top.",
      },
      {
        stepNumber: 6,
        description:
          "Bake for 40 to 45 minutes, until a toothpick inserted comes out with a few crumbs attached. Allow the brownies to cool completely before slicing and serving.",
      },
    ],
    sourceUrl: "https://www.loveandlemons.com/brownies-recipe/",
    tags: ["dessert", "chocolate", "baking", "vegetarian"],
    calories: 200, // Approximate, actual calculation needed if for real use
  },
  {
    id: "classic-guacamole",
    title: "Classic Guacamole",
    description:
      "A simple and delicious guacamole recipe that's perfect for any occasion.",
    imageUrl:
      "https://images.unsplash.com/photo-1508910238952-0dfebf373ecf?q=80&w=2336&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepTime: "10 minutes",
    cookTime: "0 minutes",
    servings: 4,
    ingredients: [
      { name: "ripe avocados", quantity: "3" },
      { name: "lime", quantity: "1", notes: "juiced" },
      { name: "cilantro", quantity: "1/4 cup", notes: "chopped" },
      { name: "red onion", quantity: "1/4 cup", notes: "finely chopped" },
      { name: "jalapeño", quantity: "1", notes: "minced (optional)" },
      { name: "salt", quantity: "1/2 teaspoon" },
      { name: "cumin", quantity: "1/4 teaspoon" },
    ],
    instructions: [
      {
        stepNumber: 1,
        description:
          "Cut the avocados in half, remove the pits, and scoop the flesh into a medium bowl.",
      },
      {
        stepNumber: 2,
        description:
          "Mash the avocado with a fork to your desired consistency (chunky or smooth).",
      },
      {
        stepNumber: 3,
        description:
          "Add the lime juice, cilantro, red onion, jalapeño (if using), salt, and cumin. Stir to combine.",
      },
      {
        stepNumber: 4,
        description:
          "Taste and adjust seasonings if necessary. Serve immediately with tortilla chips or your favorite dippers.",
      },
    ],
    sourceUrl: "https://www.simplyrecipes.com/recipes/perfect_guacamole/",
    tags: ["appetizer", "mexican", "vegan", "gluten-free"],
    calories: 150,
  },
  {
    id: "chicken-stir-fry",
    title: "Easy Chicken Stir-Fry",
    description:
      "A quick and healthy chicken stir-fry with fresh vegetables and a savory sauce.",
    imageUrl:
      "https://images.unsplash.com/photo-1621515554656-3da68ba128b1?q=80&w=3084&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepTime: "15 minutes",
    cookTime: "10-12 minutes",
    servings: 4,
    ingredients: [
      {
        name: "boneless, skinless chicken breasts",
        quantity: "1 lb",
        notes: "cut into 1-inch pieces",
      },
      { name: "soy sauce", quantity: "1/4 cup" },
      { name: "honey", quantity: "2 tablespoons" },
      { name: "sesame oil", quantity: "1 tablespoon" },
      { name: "cornstarch", quantity: "1 tablespoon" },
      { name: "olive oil", quantity: "1 tablespoon" },
      { name: "broccoli florets", quantity: "2 cups" },
      { name: "bell peppers", quantity: "1 cup", notes: "sliced (any color)" },
      {
        name: "carrots",
        quantity: "1 cup",
        notes: "julienned or thinly sliced",
      },
      { name: "garlic", quantity: "2 cloves", notes: "minced" },
      { name: "ginger", quantity: "1 teaspoon", notes: "grated" },
      { name: "cooked rice", quantity: "for serving" },
    ],
    instructions: [
      {
        stepNumber: 1,
        description:
          "In a small bowl, whisk together soy sauce, honey, sesame oil, and cornstarch. Set aside.",
      },
      {
        stepNumber: 2,
        description:
          "Heat olive oil in a large skillet or wok over medium-high heat. Add chicken and cook until browned and cooked through. Remove chicken from skillet and set aside.",
      },
      {
        stepNumber: 3,
        description:
          "Add broccoli, bell peppers, and carrots to the skillet. Stir-fry for 3-5 minutes until tender-crisp.",
      },
      {
        stepNumber: 4,
        description:
          "Add garlic and ginger to the skillet and cook for 1 minute until fragrant.",
      },
      {
        stepNumber: 5,
        description:
          "Return chicken to the skillet. Pour the sauce over everything and cook, stirring constantly, until the sauce has thickened and coats the chicken and vegetables.",
      },
      {
        stepNumber: 6,
        description: "Serve immediately over cooked rice.",
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
    prepTime: "10 minutes",
    cookTime: "0 minutes",
    servings: 4,
    ingredients: [
      {
        name: "ripe tomatoes",
        quantity: "2 large",
        notes: "sliced 1/4-inch thick",
      },
      {
        name: "fresh mozzarella cheese",
        quantity: "8 oz",
        notes: "sliced 1/4-inch thick",
      },
      { name: "fresh basil leaves", quantity: "1/4 cup" },
      { name: "extra-virgin olive oil", quantity: "2 tablespoons" },
      { name: "balsamic glaze", quantity: "1 tablespoon (optional)" },
      { name: "salt and freshly ground black pepper", quantity: "to taste" },
    ],
    instructions: [
      {
        stepNumber: 1,
        description:
          "Arrange alternating slices of tomatoes and mozzarella on a platter.",
      },
      {
        stepNumber: 2,
        description:
          "Tuck fresh basil leaves in between the tomato and mozzarella slices.",
      },
      {
        stepNumber: 3,
        description:
          "Drizzle with extra-virgin olive oil and balsamic glaze (if using).",
      },
      {
        stepNumber: 4,
        description: "Season with salt and pepper to taste. Serve immediately.",
      },
    ],
    sourceUrl:
      "https://www.foodnetwork.com/recipes/ina-garten/caprese-salad-recipe-1948534",
    tags: ["salad", "italian", "vegetarian", "gluten-free", "light meal"],
    calories: 280,
  },
  {
    id: "banana-bread",
    title: "Moist Banana Bread",
    description:
      "A delicious and easy recipe for moist banana bread that's perfect for using up ripe bananas.",
    imageUrl:
      "https://images.unsplash.com/photo-1632931057819-4eefffa8e007?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepTime: "15 minutes",
    cookTime: "60-65 minutes",
    servings: 12,
    ingredients: [
      { name: "ripe bananas", quantity: "3 large", notes: "mashed" },
      { name: "all-purpose flour", quantity: "1 1/2 cups" },
      { name: "baking soda", quantity: "1 teaspoon" },
      { name: "salt", quantity: "1/2 teaspoon" },
      { name: "ground cinnamon", quantity: "1/2 teaspoon" },
      { name: "unsalted butter", quantity: "1/2 cup", notes: "melted" },
      { name: "granulated sugar", quantity: "3/4 cup" },
      { name: "large egg", quantity: "1" },
      { name: "vanilla extract", quantity: "1 teaspoon" },
      {
        name: "walnuts or pecans",
        quantity: "1/2 cup",
        notes: "chopped (optional)",
      },
    ],
    instructions: [
      {
        stepNumber: 1,
        description:
          "Preheat oven to 350°F (175°C). Grease and flour a 9x5 inch loaf pan.",
      },
      {
        stepNumber: 2,
        description:
          "In a medium bowl, whisk together flour, baking soda, salt, and cinnamon.",
      },
      {
        stepNumber: 3,
        description:
          "In a large bowl, combine mashed bananas, melted butter, sugar, egg, and vanilla extract. Mix well.",
      },
      {
        stepNumber: 4,
        description:
          "Gradually add the dry ingredients to the wet ingredients, mixing until just combined. Do not overmix. Fold in nuts if using.",
      },
      {
        stepNumber: 5,
        description:
          "Pour batter into the prepared loaf pan and spread evenly.",
      },
      {
        stepNumber: 6,
        description:
          "Bake for 60-65 minutes, or until a toothpick inserted into the center comes out clean. If the top starts to brown too quickly, you can loosely tent it with aluminum foil.",
      },
      {
        stepNumber: 7,
        description:
          "Let the banana bread cool in the pan for 10 minutes before transferring it to a wire rack to cool completely.",
      },
    ],
    sourceUrl: "https://www.simplyrecipes.com/recipes/banana_bread/",
    tags: ["baking", "dessert", "breakfast", "snack"],
    calories: 250,
  },
  {
    id: "lemon-herb-roast-chicken",
    title: "Lemon Herb Roast Chicken",
    description:
      "A succulent and flavorful roast chicken seasoned with lemon and herbs, perfect for a family dinner.",
    imageUrl:
      "https://images.unsplash.com/photo-1597577652129-7ffad9d37ad4?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    prepTime: "20 minutes",
    cookTime: "1 hour 15 minutes - 1 hour 30 minutes",
    servings: 4,
    ingredients: [
      { name: "whole chicken", quantity: "1 (3-4 lbs)" },
      { name: "lemon", quantity: "1", notes: "halved" },
      { name: "garlic", quantity: "4 cloves", notes: "smashed" },
      { name: "fresh rosemary sprigs", quantity: "3-4" },
      { name: "fresh thyme sprigs", quantity: "3-4" },
      { name: "olive oil", quantity: "2 tablespoons" },
      { name: "salt", quantity: "1 teaspoon" },
      { name: "black pepper", quantity: "1/2 teaspoon" },
      {
        name: "onion",
        quantity: "1",
        notes: "quartered (optional, for roasting pan)",
      },
      {
        name: "carrots",
        quantity: "2",
        notes: "roughly chopped (optional, for roasting pan)",
      },
    ],
    instructions: [
      {
        stepNumber: 1,
        description:
          "Preheat oven to 425°F (220°C). Remove giblets from chicken cavity and pat the chicken dry with paper towels.",
      },
      {
        stepNumber: 2,
        description:
          "Season the cavity of the chicken generously with salt and pepper. Stuff the cavity with lemon halves, smashed garlic cloves, rosemary sprigs, and thyme sprigs.",
      },
      {
        stepNumber: 3,
        description:
          "Rub the outside of the chicken with olive oil and season generously with salt and pepper.",
      },
      {
        stepNumber: 4,
        description:
          "Place onion and carrots in the bottom of a roasting pan if desired. Place the chicken on top of the vegetables or directly in the pan.",
      },
      {
        stepNumber: 5,
        description:
          "Roast for 15 minutes at 425°F (220°C). Then, reduce the oven temperature to 375°F (190°C) and continue roasting for another 60-75 minutes, or until the internal temperature of the thickest part of the thigh reaches 165°F (74°C) and juices run clear.",
      },
      {
        stepNumber: 6,
        description:
          "Let the chicken rest for 10-15 minutes before carving. This allows the juices to redistribute, resulting in a more tender chicken.",
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
