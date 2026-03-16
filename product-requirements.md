# Product Requirements Document: recipe-n

## Overview

recipe-n is a smart mobile cooking companion designed to streamline the cooking experience, from finding the perfect recipe to following step-by-step guidance.

## 1. Core User Journeys

### Discovery to Cooking

1. **Browse recipes**: User opens the app and browses curated collections or personalized recommendations.
2. **Search recipe**: User searches for a specific dish, ingredient, or cuisine using the search bar or filters.
3. **View recipe**: User taps on a recipe card to view the ingredients, time required, difficulty, and nutritional info.
4. **Save to favorites**: User taps the heart icon to save the recipe to their personal cookbook for later.
5. **Cook recipe**: User enters "Cooking Mode" for step-by-step guidance, tracking their progress through the recipe.

## 2. Key Features (10)

1. **Smart Ingredient Substitution**: AI-powered suggestions for missing ingredients based on what the user has or common alternatives.
2. **Dietary Restrictions**: Robust filtering and profile settings to highlight recipes fitting specific diets (vegan, keto, gluten-free, etc.).
3. **Step-by-Step Guidance**: A dedicated cooking mode that breaks recipes down into single, manageable steps with built-in timers.
4. **Voice-Activated Cooking**: Hands-free navigation through cooking steps using voice commands ("next", "previous", "repeat").
5. **Pantry Management**: Digital inventory tracking to know what ingredients are available at home.
6. **Automatic Grocery Lists**: One-tap conversion of recipe ingredients into an organized shopping list.
7. **Recipe Scaling**: Automatically adjust ingredient quantities based on desired serving sizes.
8. **Nutritional Tracking**: Detailed macro and micronutrient breakdowns for every recipe.
9. **Meal Planning**: A calendar view to schedule recipes for the week and generate bulk shopping lists.
10. **Community Ratings & Reviews**: User-generated feedback, photos, and tips on recipes.

## 3. Technical Constraints

- **Mobile-First**: The UI/UX must be optimized for mobile screens (phones and tablets), prioritizing touch interactions and one-handed use.
- **Offline-First**: Core functionalities (viewing saved recipes, pantry, grocery lists) must work seamlessly without an internet connection, syncing when connectivity is restored.
- **Minimal Battery Usage**: Cooking sessions can be long; the app (especially voice recognition and screen-on features) must be optimized to prevent excessive battery drain.

## 4. Success Criteria

- **Efficiency**: Users cook 30% faster (measured by time spent in Cooking Mode vs. estimated recipe time).
- **Engagement**: Users save 20% more recipes (month-over-month increase in favorites per active user).

## 5. Target Platforms

- **Primary**: iOS (Swift/React Native)
- **Secondary**: Android (Kotlin/React Native)
- **Companion**: Web (React/Next.js) for easy browsing and meal planning on larger screens.
