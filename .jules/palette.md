## 2024-05-18 - Voice Control Button Accessibility

**Learning:** The voice control button (`MicButton`) in this app serves multiple roles (listening, speaking, generally enabled) which combine to form its overall active state (`isVoiceEnabled`). When an interactive element's active state is derived from multiple internal sub-states, standardizing the `accessibilityLabel` based on the unified active state ensures screen reader users understand the button's overarching function without being confused by transient sub-states like "speaking" or "listening".
**Action:** Always provide a clear, unified `accessibilityLabel` and `accessibilityState` on complex buttons that combine multiple feature states into a single user action.
