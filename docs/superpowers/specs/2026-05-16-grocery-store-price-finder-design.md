# Grocery Store Price Finder Design

**Date:** 2026-05-16
**Status:** Approved

---

## Overview

Extend the Cookkit grocery list functionality with nearby store discovery and price comparison. Users can view nearby 99 Speedmart locations on a map, compare total prices for their grocery list across stores, and get navigation assistance.

**Primary goals:**
1. Find nearby grocery stores (99 Speedmart initially, multi-chain architecture)
2. Show estimated total price for user's grocery list at each store
3. Provide navigation assistance to selected stores
4. Allow user to decide trade-offs between distance and price

---

## Data Model

### Supabase (cloud, shared data)

```sql
-- Store chains (99 Speedmart, Tesco, Giant, etc.)
CREATE TABLE public.store_chains (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  logo_url text,
  website_url text,
  color_hex character varying,
  CONSTRAINT store_chains_pkey PRIMARY KEY (id)
);

-- Specific store locations
CREATE TABLE public.stores (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  chain_id uuid NOT NULL,
  name character varying NOT NULL,
  address text,
  latitude numeric,
  longitude numeric,
  -- Nearby search: stores within 25km radius, max 20 results returned
  phone character varying,
  opening_hours jsonb,      -- Format: [{"day":0,"open":"08:00","close":"22:00"},...] where day 0=Sunday
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stores_pkey PRIMARY KEY (id),
  CONSTRAINT stores_chain_id_fkey FOREIGN KEY (chain_id) REFERENCES public.store_chains(id)
);

-- Product matches (maps ingredients to Hargapedia products)
CREATE TABLE public.ingredient_product_match (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  base_ingredient_id uuid,
  product_name character varying NOT NULL,
  hargapedia_product_id text,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ingredient_product_match_pkey PRIMARY KEY (id),
  CONSTRAINT ingredient_product_match_base_ingredient_id_fkey FOREIGN KEY (base_ingredient_id) REFERENCES public.base_ingredient(id)
);

-- Store prices (from Hargapedia scraping)
CREATE TABLE public.store_prices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  store_id uuid NOT NULL,
  ingredient_product_match_id uuid NOT NULL,
  price_cents integer NOT NULL,
  currency character varying DEFAULT 'MYR',
  source_url text,
  scraped_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT store_prices_pkey PRIMARY KEY (id),
  CONSTRAINT store_prices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id),
  CONSTRAINT store_prices_ingredient_product_match_id_fkey FOREIGN KEY (ingredient_product_match_id) REFERENCES public.ingredient_product_match(id)
);

-- Indexes for performance
CREATE INDEX idx_store_prices_store_id ON public.store_prices(store_id);
CREATE INDEX idx_store_prices_match_id ON public.store_prices(ingredient_product_match_id);
CREATE INDEX idx_ingredient_product_match_ingredient_id ON public.ingredient_product_match(base_ingredient_id);
```

### WatermelonDB (local, user-specific)

```typescript
// store_location (cached store data)
tableSchema({
  name: "store_location",
  columns: [
    { name: "id", type: "string", isIndexed: true },
    { name: "chain_id", type: "string" },
    { name: "name", type: "string" },
    { name: "address", type: "string" },
    { name: "latitude", type: "number" },
    { name: "longitude", type: "number" },
    { name: "phone", type: "string", isOptional: true },
    { name: "opening_hours", type: "string", isOptional: true }, // JSON: [{"day":0,"open":"08:00","close":"22:00"}]
    { name: "synced_at", type: "number", isIndexed: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})

// user_store_preference (favorites, visits)
tableSchema({
  name: "user_store_preference",
  columns: [
    { name: "id", type: "string", isIndexed: true },
    { name: "store_id", type: "string", isIndexed: true },
    { name: "is_favorite", type: "boolean" },
    { name: "visit_count", type: "number" },
    { name: "last_visited_at", type: "number", isOptional: true },
    { name: "created_at", type: "number" },
    { name: "updated_at", type: "number" },
  ],
})
```

**Design decisions:**
- Link to existing `base_ingredient` table for consistency
- Store/price data in Supabase (shared), user preferences in WatermelonDB (user-specific)
- Separate chain/location abstraction for future multi-chain expansion
- Product matches stored once, then price data per store

---

## UI Design

### Primary Map Interface

Full-screen map with store markers and bottom sheet store list.

**Components:**
- Map: Full-screen `expo-maps` with store markers
**Markers:**
- Gray base marker for all stores (32px diameter, white border, 3px)
- Cheapest store: Green "$" badge (orange background, white text, 12px, positioned top-right of marker)
- Closest store: Blue distance badge (blue background, white text, showing "1.2km")
- Bottom sheet: 50% initial height, expandable to 90%, drags to dismiss
- Floating action: "Find Near Me" button

**Store list card:**
```
99 Speedmart - TTDI    $ RM32
1.2 km away • Open until 10 PM
[Navigate]      [View Prices]
```

### Store Detail View

Expands bottom sheet on marker tap, showing:
- Store name, address, phone, hours
- Favorite toggle
- Total estimated price for grocery list
- Price breakdown by category
- Primary actions: Navigate, View Item List

### Price Match Confirmation

Modal shown for low-confidence fuzzy matches (< 80%):
- Displays ingredient → Hargapedia product mapping
- Shows confidence scores
- Allows user to confirm or select alternative

### Navigation to Feature

Add "Find Stores" button to existing grocery list page (`app/grocery-list/index.tsx`):
- Position: Top-right header, next to edit button
- Icon: Map pin icon
- Opens map view pre-filtered to nearby stores with current list

---

## Architecture

### New Directory Structure

```
app/
  grocery-map/                    # Map view route
    index.tsx                     # Main map interface

components/
  GroceryMap/                    # Map components
    StoreMarker.tsx              # Individual store marker
    StoreList.tsx                # Bottom sheet store list
    StoreCard.tsx                # Store list item
    StoreDetailView.tsx          # Expanded store details
    PriceMatchConfirmation.tsx   # Low-confidence match modal
    StoreRankings.tsx            # "Closest" / "Cheapest" comparison

hooks/
  queries/
    useStoreQueries.ts           # TanStack Query hooks for stores
    usePriceQueries.ts           # TanStack Query hooks for prices
  useLocation.ts                 # User location hook
  useDistanceCalculation.ts      # Haversine distance logic

data/
  db/
    repositories/
      StoreRepository.ts         # Store data access
      StorePriceRepository.ts    # Price data access
    models/
      StoreLocation.ts           # WatermelonDB model
      UserStorePreference.ts     # WatermelonDB model

supabase-api/
  stores.ts                      # Supabase store API
  prices.ts                      # Supabase price API

services/
  hargapedia-scraper.ts          # Web scraper (run as cron/backend)
  price-matching.ts              # Fuzzy matching logic
  geolocation.ts                 # Location services

utils/
  price-calculator.ts            # Calculate total list price per store
  fuzzy-match.ts                 # Ingredient name matching
```

### Data Flow

```
User opens "Find Stores"
         ↓
useLocation() gets user position
         ↓
useStoreQueries() fetches nearby stores from Supabase (within 25km radius, max 20 stores)
         ↓
usePriceQueries() fetches prices for user's ingredients
         ↓
price-matching.ts maps ingredients to Hargapedia products
         ↓
UI renders map with markers + bottom sheet
         ↓
User taps store → StoreDetailView shows breakdown
         ↓
User taps "Navigate" → Opens Maps app with directions
```

### Key Integrations

| Layer | Integration |
|-------|-------------|
| **Maps** | `expo-maps` for rendering map + markers |
| **Location** | `expo-location` for user position |
| **Local Storage** | WatermelonDB for cached stores + preferences |
| **Cloud Storage** | Supabase for stores, prices, product matches |
| **State** | TanStack Query for data fetching + caching |

---

## Error Handling

### Location Access
- **Permission denied**: Show toast + "Enable in Settings" button
- **Location unavailable**: Use last known location + "Showing cached stores" banner
- **Timeout after 10s**: Fall back to manual location selection

### Price Data
- **No price match found**: Show "Price unavailable" icon, still display store
- **Stale price data (>7 days)**: Show "Prices may be outdated" warning
- **Hargapedia scrape failed**: Log to Sentry, use cached data if available

### Store Data
- **No nearby stores**: Show empty state with "Search in another area" button
- **Network error**: Try local cache first, retry in background
- **Invalid coordinates**: Validate before map render, show error boundary

---

## Testing Strategy

### Unit Tests
- Fuzzy matching algorithm (`fuzzy-match.ts`)
- Distance calculation (`useDistanceCalculation.ts`)
- Price aggregation (`price-calculator.ts`)

### Integration Tests
- Store repository + Supabase sync
- Price matching + confidence scoring
- Location permissions handling

### E2E Tests
- Complete flow: Grocery list → Find stores → Select store → Navigate
- Price match confirmation modal interaction
- Map marker tap → detail view expand

### Manual Testing Checklist
- [ ] GPS vs. cached location fallback
- [ ] Price badge updates when user adds/removes list items
- [ ] Store marker ranking (closest vs cheapest)
- [ ] Offline mode (cached stores still show)
- [ ] iOS vs. Android map styling

---

## Implementation Phases

### Phase 1: Foundation (MVP)
1. Database schema + migrations
2. Store repository + Supabase API
3. Basic map integration with static store markers
4. Location hook + user position

### Phase 2: Price Integration
1. Product matching fuzzy algorithm
2. Hargapedia scraper (backend cron)
3. Price query hooks + caching
4. Price badge on store markers

### Phase 3: UI Polish
1. Store list bottom sheet
2. Store detail view with breakdown
3. Price match confirmation modal
4. Closest/Cheapest rankings

### Phase 4: Enhanced Features
1. User favorites + visit tracking
2. Manual location selection: "Change Location" button opens address search with Google Places Autocomplete, updates map center
3. Multi-chain support (Tesco, Giant)
4. Price history/trends

---

## Open Questions

None at this time.