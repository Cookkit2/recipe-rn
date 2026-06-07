#!/bin/bash
# Post-install patches for Cookkit
# These fix build errors in third-party modules.

set -e

# 1. Patch expo-speech-recognition Swift build error (v3.1.3)
# promise.resolver is ResolveClosure (JavaScriptValue -> Void) but
# EXPromiseResolveBlock is @Sendable (Any?) -> Void.
# Fix: use promise.legacyResolver which has the correct type.
SPEECH_FILE="node_modules/expo-speech-recognition/ios/ExpoSpeechRecognitionModule.swift"
if [ -f "$SPEECH_FILE" ]; then
  if grep -q 'promise\.resolver,' "$SPEECH_FILE" 2>/dev/null; then
    sed -i '' 's/resolve: promise\.resolver,/resolve: promise.legacyResolver,/g' "$SPEECH_FILE"
    echo "postinstall-patch: patched expo-speech-recognition promise.resolver -> legacyResolver"
  else
    echo "postinstall-patch: expo-speech-recognition already patched or different version"
  fi
fi

# 2. Fix deployment targets in Pods project (< 16.4 → 16.4)
# Some pods (expo-speech-recognition, react-native-image-colors, etc.) have
# deployment targets below 16.4 which conflicts with ExpoModulesCore.
# The config plugin fixes the app target, but pod install regenerates the
# Pods project after prebuild, so we need to fix it here too.
PODS_PBXPROJ="ios/Pods/Pods.xcodeproj/project.pbxproj"
if [ -f "$PODS_PBXPROJ" ]; then
  if grep -q 'IPHONEOS_DEPLOYMENT_TARGET = 1[0-5]\.' "$PODS_PBXPROJ" 2>/dev/null; then
    # macOS sed: replace deployment targets below 16.0 with 16.4
    sed -i '' -E 's/IPHONEOS_DEPLOYMENT_TARGET = (1[0-5]\.[0-9]);/IPHONEOS_DEPLOYMENT_TARGET = 16.4;/g' "$PODS_PBXPROJ"
    echo "postinstall-patch: bumped deployment targets < 16.0 → 16.4 in Pods project"
  else
    echo "postinstall-patch: Pods deployment targets already >= 16.0"
  fi
fi
