# RecyclingList

Cookkit's list adapter uses Expo SDK 58 native recycling APIs:

- iOS: `ScrollView` with `LazyVStack.ForEach` or `LazyHStack.ForEach`.
- Android: `LazyColumn.Items` or `LazyRow.Items`.
- Web: React Native `FlatList`.

Pass data and a stable item key. The adapter groups grid items into rows before handing the data to native; it does not render every card up front. An odd last row keeps the same column width. Keys inside each recycled row reset item-local React state when its data changes.

Keep the native scroll viewport bounded. Do not put this component inside another scrolling container. Summaries, empty states and footers belong in `header`, `empty` and `footer`. The bounded four-card Cook Now section is a regular grid in the recipe list's header.

Use `onVisibleRangeChange` for pagination and image prefetch. Its indices refer to the original items, including in multi-column grids. `onScrolledChange` is only a decoration threshold (10 points), not a continuous offset API. Continuous geometry observation is available on iOS 18+; card-position binding works on iOS 17+.

Horizontal lists require an explicit viewport height and `itemSize`. `itemSpacing` is separate from card width. `snapToItems` uses SwiftUI scroll targets and Android Compose snapping.

## Android source patch

Expo UI 58.0.20 does not expose `LazyRow` snapping. `patches/@expo%2Fui@58.0.20.patch` adds the optional `snapToItems` prop using `rememberSnapFlingBehavior` with `SnapPosition.Start`. Its default is false.

`package.json` configures Android autolinking to build `expo-ui` from source so the patch is not bypassed by the precompiled AAR. Rebuild the Android app after installing dependencies. Reassess the patch when updating Expo UI.

References: [SwiftUI large lists](https://docs.expo.dev/versions/v58.0.0/sdk/ui/swift-ui/list/#large-lists), [Compose large lists](https://docs.expo.dev/versions/v58.0.0/sdk/ui/jetpack-compose/lazycolumn/#large-lists).
