# Function Gemma AI Assistant Integration

## Overview

DoneDish now includes an AI-powered assistant powered by Google's Function Gemma model. This allows users to interact with the app using natural language to:

> **Note:** This integration was originally designed for the Fridgit smart refrigerator concept, but has been implemented in the DoneDish pantry/cooking app.

- Add/remove items from pantry inventory
- Check what's expiring soon
- Create and manage grocery lists
- Find recipes based on available ingredients
- Get meal suggestions

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Assistant UI                              │
│              (app/ai-assistant/index.tsx)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 useFunctionGemma Hook                          │
│         (lib/function-gemma/useFunctionGemma.ts)                  │
│    - State management for messages and model status                  │
│    - Message sending and receiving                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FunctionGemmaService                              │
│         (lib/function-gemma/FunctionGemmaService.ts)            │
│    - Model initialization                                         │
│    - Tool definitions (10+ DoneDish functions)                   │
│    - Tool execution via DoneDishToolExecutor                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              DoneDishToolExecutor                             │
│    (lib/function-gemma/DoneDishToolExecutor.ts)                │
│    - WatermelonDB operations (ingredients, grocery_items)        │
│    - Supabase API calls (recipes, product lookup)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              llama.rn (Native Bridge)                          │
│    - GGUF model loading and inference                             │
│    - Tool calling via Jinja templates                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Function Gemma 270M GGUF                           │
│    - ~250MB model file stored in app documents                 │
│    - On-device inference (250-550MB RAM)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component        | Technology                          |
| ---------------- | ----------------------------------- |
| Mobile Framework | React Native 0.83+ with Expo SDK 55 |
| AI Model         | Function Gemma 270M IT              |
| Model Format     | GGUF (Q4_K_M quantization)          |
| Native Binding   | llama.rn                            |
| Local Database   | WatermelonDB                        |
| Cloud Backend    | Supabase                            |

## Available Tools

### Inventory Management

- `add_item` - Add food to pantry
- `remove_item` - Remove/consume food
- `get_inventory` - List items in pantry

### Expiration Tracking

- `get_expiring_items` - Get items expiring soon
- `set_expiry_alert` - Set reminder for expiring items

### Grocery List

- `add_to_grocery_list` - Add item to grocery list
- `get_grocery_list` - Get current grocery list

### Recipe & Meal Planning

- `find_recipes` - Find recipes by ingredients
- `suggest_meals` - Suggest meals based on inventory

### Product Identification

- `scan_barcode` - Identify product from barcode

## Usage Examples

### Adding Items

**User says:** "Add 2 cartons of milk to my fridge"

**Model calls:** `add_item(name="milk", quantity=2, unit="cartons", location="fridge")`

**Response:** Added 2 cartons of milk to fridge.

### Checking Expiry

**User says:** "What's expiring soon?"

**Model calls:** `get_expiring_items(days_ahead=3)`

**Response:** Here's what's expiring in the next 3 days:

- Milk (2 days)
- Yogurt (1 day)
- Chicken (3 days)

### Finding Recipes

**User says:** "What can I make with eggs and cheese?"

**Model calls:**

1. `get_inventory(location="fridge")` - Get available ingredients
2. `find_recipes(ingredients=["eggs", "cheese"], meal_type="dinner")` - Find recipes

**Response:** Based on what you have, here are some recipe suggestions:

1. Cheese Omelette
2. Scrambled Eggs
3. Egg and Cheese Sandwich

## File Structure

```
lib/function-gemma/
├── index.ts                          # Public exports
├── FunctionGemmaService.ts            # Main AI service
├── DoneDishToolExecutor.ts           # Tool executor implementation
├── useFunctionGemma.ts               # React hook
└── AIAssistantContext.tsx            # Context provider

app/ai-assistant/
├── _layout.tsx                       # Wrapper with providers
└── index.tsx                         # Chat UI screen
```

## Performance

| Metric          | Value                     |
| --------------- | ------------------------- |
| Model Size      | ~250MB (Q4_K_M)           |
| RAM Usage       | 250-550MB                 |
| Inference Speed | ~50 tokens/second         |
| First Load Time | ~30-60 seconds (download) |

## Installation

### 1. Install Dependencies

```bash
npm install llama.rn react-native-fs axios --legacy-peer-deps
```

### 2. Update app.json

The llama.rn plugin is already configured in app.json:

```json
[
  "llama.rn",
  {
    "enableEntitlements": true,
    "entitlementsProfile": "production",
    "forceCxx20": true,
    "enableOpenCL": true
  }
]
```

### 3. Run the App

```bash
# Development
npm run dev

# iOS
npm run ios

# Android
npm run android
```

### 4. Access AI Assistant

There are two ways to interact with the AI assistant:

**A) AI Search Bar (Recommended - Main Pantry)**

- Navigate to the main pantry screen (home)
- Type naturally in the search bar at the top
- AI analyzes your query and calls appropriate functions
- Results appear as previews below the search bar
- Tap on a result to view full details in a bottom sheet

**B) Dedicated Chat Screen**

- Navigate to `/ai-assistant` route for full chat experience
- View conversation history
- See detailed tool call information

## Development

### Using the Hook

```typescript
import { useFunctionGemma } from '~/lib/function-gemma/useFunctionGemma';

function MyComponent() {
  const {
    messages,
    input,
    isGenerating,
    isModelLoaded,
    sendMessage,
    setInput,
  } = useFunctionGemma();

  return (
    <View>
      {/* Render chat UI */}
    </View>
  );
}
```

### Adding Custom Tools

To add a new tool, edit `lib/function-gemma/FunctionGemmaService.ts`:

```typescript
export const FRIDGIT_TOOLS: FridgitTool[] = [
  // ... existing tools
  {
    type: "function",
    function: {
      name: "my_custom_tool",
      description: "Description of what the tool does",
      parameters: {
        type: "object",
        properties: {
          param1: {
            type: "string",
            description: "Parameter description",
          },
        },
        required: ["param1"],
      },
    },
  },
];
```

Then implement the tool executor in `DoneDishToolExecutor.ts`:

```typescript
async myCustomTool(params: any): Promise<any> {
  // Your implementation
  return { success: true, data: '...' };
}
```

## Troubleshooting

### Model Download Fails

- Check network connection
- Ensure Hugging Face URL is accessible
- Try clearing app cache and reinstalling

### Out of Memory

- Reduce `n_gpu_layers` in `FunctionGemmaService.ts`
- Use more aggressive quantization (Q3_K or Q2_K)

### Slow Inference

- Increase `n_gpu_layers` if GPU available
- Reduce `n_ctx` (context window size)
- Ensure device has adequate RAM

### Tool Calling Not Working

- Verify `DoneDishToolExecutor` is connected to `FunctionGemmaService`
- Check WatermelonDB schema matches expected models
- Enable debug logging in `FunctionGemmaService.ts`

## Next Steps

### Phase 1: Base Model (Current)

✅ Integrate base Function Gemma
✅ Implement tool calling
✅ Connect to WatermelonDB and Supabase
⏳️ Test with real users
⏳️ Gather feedback

### Phase 2: Fine-Tuning

- Generate training data based on user interactions
- Fine-tune Function Gemma with DoneDish-specific examples
- Validate improved tool selection accuracy
- Deploy fine-tuned model

### Phase 3: Enhancements

- Add streaming responses
- Implement multi-turn conversations with context
- Add voice input integration
- Add recipe image generation

## Resources

- **llama.rn:** https://github.com/mybigday/llama.rn
- **Function Gemma:** https://huggingface.co/unsloth/functiongemma-270m-it-GGUF
- **Google AI Function Calling:** https://ai.google.dev/gemma/docs/capabilities/function-calling
- **Unsloth FunctionGemma:** https://docs.unsloth.ai/models/functiongemma
