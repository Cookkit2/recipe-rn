# Maestro Critical Path — Cookkit

## Critical User Flows (priority order)

### P0 — Must Pass Every PR

1. **App Launch** — cold start, lands on Pantry
2. **Auth — Guest Sign In** — skip auth, enter app
3. **Add Ingredient** — pantry > add > type name > save
4. **View Recipe** — tap recipe > see details
5. **Search** — search icon > type query > see results

### P1 — Should Pass (core value)

6. **Meal Plan** — navigate to meal plan screen
7. **Grocery List** — navigate to grocery list
8. **Profile** — open profile > see settings

### P2 — Nice to Have

9. **Onboarding Skip** — fresh install > skip onboarding
10. **Voice Cooking** — recipe steps > start cooking mode

## App Info

- Bundle ID: `app.cookkit.cookkit` (production) / `app.cookkit.cookkit` (dev)
- Test IDs: well-instrumented (see `constants/test-ids.ts`)
- E2E flag: `EXPO_PUBLIC_E2E=true` skips onboarding
- Simulators: iPhone 15 Pro (EEC474A9)

## Running

```bash
# Start dev server (if not running)
EXPO_PUBLIC_E2E=true npx expo start --ios

# Run all flows
export PATH="$PATH:$HOME/.maestro/bin"
maestro test .maestro/flows/

# Run single flow
maestro test .maestro/flows/01-launch.yaml
```
