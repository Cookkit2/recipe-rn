#!/bin/bash
# Patch expo-speech-recognition Swift build error (v3.1.3)
# promise.resolver is ResolveClosure (JavaScriptValue -> Void) but
# EXPromiseResolveBlock is @Sendable (Any?) -> Void.
# Fix: use promise.legacyResolver which has the correct type.
# Upstream fix pending; remove this script when updating past the broken version.

set -e

FILE="node_modules/expo-speech-recognition/ios/ExpoSpeechRecognitionModule.swift"

if [ ! -f "$FILE" ]; then
  echo "postinstall-patch: $FILE not found, skipping"
  exit 0
fi

if grep -q 'promise\.resolver,' "$FILE" 2>/dev/null; then
  sed -i '' 's/resolve: promise\.resolver,/resolve: promise.legacyResolver,/g' "$FILE"
  echo "postinstall-patch: patched expo-speech-recognition promise.resolver -> legacyResolver"
else
  echo "postinstall-patch: expo-speech-recognition already patched or different version"
fi
