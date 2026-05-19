# Grocery Map - Full-Screen Map + Bottom Drawer

**Date:** 2026-05-17

## Overview

Replace current grocery list view with full-screen map + snap-to bottom drawer showing store information.

## Architecture

```
GroceryMapPage
├── MapView (expo-maps, 100% height)
│   ├── Markers (adaptive clustering)
│   └── Store markers (custom icon + price)
├── BottomSheet (@gorhom/bottom-sheet)
│   └── StoreInfoCard (expanded) OR MiniStoreList (compact)
└── Loading/Error states
```

## Components

### MapLayer (new)
- Expo Maps integration (Google Maps on Android, Apple Maps on iOS)
- Custom markers with grocery icon (🛒) + price badge
- Adaptive clustering (>10km zoom scale)
- Marker tap -> set selected store state

### BottomSheet (new)
- Uses `@gorhom/bottom-sheet` (already installed)
- 3 snap positions: 10% (hidden), 25% (compact), 50% (expanded)
- Gesture-driven drag with reanimated
- Smooth spring animations

### MiniStoreList (new)
- Shows 3-5 nearest stores when none selected
- Compact card: name + price + distance
- Tap card -> select store + expand bottom sheet

### StoreInfoCard (new)
- Expanded card when store selected
- Shows: name, address, hours, price total, distance
- Two buttons: "View Prices" + "Navigate"

## Data Flow

```
useLocation -> useNearbyStores -> useDistanceCalculation -> storesWithDistance
     ↓
MapLayer (markers with store data)
     ↓
user taps marker -> setSelectedStore -> BottomSheet renders StoreInfoCard
```

## Technical Details

### Map Configuration
- Initial zoom: fit all stores + user location
- Center: user location
- Cluster radius: 50px (adaptive based on zoom)

### Bottom Sheet States
- `selectedStore = null`: Show MiniStoreList (3-5 nearest)
- `selectedStore = Store`: Show StoreInfoCard

### Marker Badge Format
- Total price for user's grocery list
- Format: `$12.50` or `$150` depending on magnitude

## Removed/Modified

- `StoreList.tsx` - Replaced by MiniStoreList + StoreInfoCard
- `StoreRankings.tsx` - Can be reused or integrated into mini cards
- `StoreCard.tsx` - Can be reused in StoreInfoCard

## Success Criteria

- Full-screen map renders on iOS and Android
- Bottom sheet snaps correctly to 3 positions
- Marker tap expands sheet with store details
- "View Prices" and "Navigate" buttons work
- Adaptive clustering at high zoom levels