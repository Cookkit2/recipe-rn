# Dummy public values for the Detox assistant build. Not credentials.
# Sourced by the iOS E2E scripts and by the xcodebuild command in detox.config.js
# so the embedded JS bundle inlines these URLs.
export EXPO_PUBLIC_E2E=true
export FORCE_BUNDLING=1
# The E2E flag selects the fixed dummy chat fixture in lib/agent/testing/e2e-contract.ts.
export EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export EXPO_PUBLIC_SUPABASE_ANON_KEY=test-anon-key

# expo-updates removes this override during a normal pod install. Restore it
# before the E2E build, without replacing an existing native-debug override.
if [ ! -f ios/.xcode.env.updates ]; then
  cat > ios/.xcode.env.updates <<'COOKKIT_E2E_BUNDLING'
# Detox debug builds embed the JS bundle so the simulator does not need Metro.
# The bundle phase sets SKIP_BUNDLING=1 for Debug, then sources this file.
# Normal Xcode Debug runs leave EXPO_PUBLIC_E2E unset and still load from Metro.
if [ "$EXPO_PUBLIC_E2E" = "true" ]; then
  unset SKIP_BUNDLING
fi
COOKKIT_E2E_BUNDLING
fi
