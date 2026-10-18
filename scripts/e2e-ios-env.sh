# Dummy public values for the Detox assistant build. Not credentials.
# Sourced by the iOS E2E scripts and by the xcodebuild command in detox.config.js
# so the embedded JS bundle inlines these URLs.
export EXPO_PUBLIC_E2E=true
export EXPO_PUBLIC_NEBIUS_API_KEY=test-nebius-key
export EXPO_PUBLIC_NEBIUS_MODEL=mock-tool-model
export EXPO_PUBLIC_NEBIUS_BASE_URL=http://127.0.0.1:8787/v1
export EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export EXPO_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
