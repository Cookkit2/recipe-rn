## 2023-10-27 - FlatList inside ScrollView
**Learning:** React Native's `FlatList` with `scrollEnabled={false}` inside a `ScrollView` for small, static grids bypasses virtualization benefits and introduces unnecessary rendering overhead and memory usage.
**Action:** Replace it with a mapped `View` utilizing flexbox (`flex-row flex-wrap`) to improve rendering performance.
