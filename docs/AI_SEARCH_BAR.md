# AI Search Bar Integration

## Overview

The AI Search Bar is an intelligent search interface powered by Google's Function Gemma model. It replaces traditional search with natural language understanding, allowing users to:
- Search for ingredients and inventory items
- Find recipes with available ingredients
- Manage grocery lists via natural language
- Get AI-powered recommendations
- Ask questions about their pantry and cooking

## Features

### Natural Language Search
- Type naturally: "What do I have in my fridge?" instead of filtering
- Multi-intent: "Add milk to my grocery list" performs action
- Context-aware: "What's expiring soon?" understands expiry dates

### Quick Actions
Pre-built prompts for common tasks:
- "What do I have?"
- "What's expiring soon?"
- "Add to grocery list"
- "Find recipes with..."

### AI Status Indicator
Shows real-time model status:
- Loading AI... - Model is being downloaded
- AI Ready - Model is ready to process queries

### Expandable Input
- Tap arrow to expand for multi-line input
- Quick actions show when expanded
- Collapses after sending

### Response Preview
Shows last AI response with option to view full details in a bottom sheet.

## Usage

### Basic Usage

```typescript
import AISearchBar from '~/components/ui/ai-search-bar';

export default function MyScreen() {
  return (
    <AISearchBar
      placeholder="Search or ask AI..."
      showAI={true}
      showHistory={true}
      onResult={(result) => {
        console.log('AI result:', result);
      }}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | string | 'Search pantry, recipes, or ask AI...' | Input placeholder text |
| `showAI` | boolean | true | Show AI status indicator and sparkles icon |
| `showHistory` | boolean | false | Show quick actions and history |
| `onResult` | (result: any) => void | undefined | Callback when AI responds with tool results |
| `className` | string | '' | Additional CSS classes |

## Example Queries

### Inventory Management
- "What do I have in my fridge?"
- "Show me all dairy products"
- "What vegetables do I have?"
- "How much milk do I have?"

### Expiration Tracking
- "What's expiring soon?"
- "What expires in the next 3 days?"
- "Remind me about the yogurt tomorrow"

### Grocery List
- "Add eggs to my grocery list"
- "What's on my grocery list?"
- "Add 2 cartons of milk with high priority"

### Recipes
- "What can I make with eggs and cheese?"
- "Find dinner recipes with chicken"
- "Suggest meals for tonight"
- "I have tomatoes, what can I cook?"

### Product Lookup
- "Scan this barcode" (integrates with camera)
- "What is this product?"

## Integration in Pantry

The AI Search Bar is integrated into the main pantry screen (`components/Pantry/PantryWrapper.tsx`):

```typescript
import AISearchBar from "~/components/ui/ai-search-bar";

// In the render:
<AISearchBar />
```

## How It Works

### Flow
1. User types query in search bar
2. Query is sent to Function Gemma model (on-device)
3. Model analyzes query and determines intent
4. Model calls appropriate tools:
   - `get_inventory` for inventory queries
   - `get_expiring_items` for expiry queries
   - `add_to_grocery_list` for grocery list
   - `find_recipes` for recipe queries
5. Tool results are returned from DoneDish backend
6. Model formulates natural language response
7. Response is displayed with tool call details

### Architecture

```
AISearchBar Component
    ↓
useFunctionGemma Hook
    ↓
FunctionGemmaService
    ↓
Tool Executor (DoneDishToolExecutor)
    ↓
WatermelonDB / Supabase API
```

## Performance

| Metric | Value |
|--------|-------|
| First Response | ~30-60 seconds (model download) |
| Subsequent Responses | ~1-2 seconds |
| Model Size | ~250MB |
| RAM Usage | 250-550MB |

## Components

### AISearchBar
`components/ui/ai-search-bar.tsx`
Main search bar component with AI integration.

### AIResponseSheet
`components/ui/ai-response-sheet.tsx`
Bottom sheet for viewing detailed AI responses with tool call information.

## Troubleshooting

### AI Not Loading
- Check network connection (for first-time download)
- Ensure llama.rn plugin is configured in app.json
- Restart the app

### Slow Responses
- Reduce context window size in FunctionGemmaService
- Check device RAM availability
- Close other apps to free memory

### Wrong Tool Called
- Try rephrasing your query
- Check if tool is implemented in DoneDishToolExecutor
- Review tool definitions in FunctionGemmaService

## Future Enhancements

- [ ] Voice input integration
- [ ] Search history with favorites
- [ ] Recipe recommendations based on preferences
- [ ] Meal planning assistant
- [ ] Nutritional analysis of pantry
- [ ] Shopping suggestions based on expiring items

## Resources

- [Function Gemma Documentation](https://ai.google.dev/gemma/docs/functiongemma)
- [llama.rn GitHub](https://github.com/mybigday/llama.rn)
- [DoneDish AI Context](../AI_CONTEXT.md)
