#!/bin/bash
# Post-install patches for Cookkit
# These fix build errors in third-party modules.
# Run: bash scripts/postinstall-patch.sh
# Also runs automatically via "postinstall" npm script.

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
    echo "postinstall-patch: expo-speech-recognition already patched"
  fi
fi

# 2. Fix deployment targets in Pods project (< 16.4 → 16.4)
# Some pods have deployment targets below 16.4 which conflicts with ExpoModulesCore.
PODS_PBXPROJ="ios/Pods/Pods.xcodeproj/project.pbxproj"
if [ -f "$PODS_PBXPROJ" ]; then
  if grep -q 'IPHONEOS_DEPLOYMENT_TARGET = 1[0-5]\.' "$PODS_PBXPROJ" 2>/dev/null; then
    sed -i '' -E 's/IPHONEOS_DEPLOYMENT_TARGET = (1[0-5]\.[0-9]);/IPHONEOS_DEPLOYMENT_TARGET = 16.4;/g' "$PODS_PBXPROJ"
    echo "postinstall-patch: bumped deployment targets < 16.0 → 16.4 in Pods project"
  else
    echo "postinstall-patch: Pods deployment targets already >= 16.0"
  fi
fi

# 3. Patch @babel/plugin-transform-typescript to allow definite-assigned fields
# with legacy decorators. Legacy decorators null out node.decorators and set
# node.value to a call expression. The TS plugin throws "Definitely assigned
# fields cannot be initialized here" because it sees value but no decorators.
# Fix: skip the error when node.value is a CallExpression (set by decorators).
BABEL_TS="node_modules/@babel/plugin-transform-typescript/lib/index.js"
if [ -f "$BABEL_TS" ]; then
  if grep -q 'isDecoratorInit' "$BABEL_TS" 2>/dev/null; then
    echo "postinstall-patch: babel-plugin-transform-typescript already patched"
  else
    sed -i '' 's/if (node.value) {$/const isDecoratorInit = node.value \&\& t.isCallExpression(node.value); if (node.value \&\& !isDecoratorInit) {/' "$BABEL_TS"
    echo "postinstall-patch: patched babel-plugin-transform-typescript for definite+decorators"
  fi
fi

# 4. Patch babel-preset-expo to add allowDeclareFields: true
BABEL_PRESET_TS="node_modules/babel-preset-expo/build/configs/typescript.js"
if [ -f "$BABEL_PRESET_TS" ]; then
  if grep -q 'allowDeclareFields' "$BABEL_PRESET_TS" 2>/dev/null; then
    echo "postinstall-patch: babel-preset-expo typescript already has allowDeclareFields"
  else
    sed -i '' 's/allowNamespaces: true,/allowNamespaces: true, allowDeclareFields: true,/g' "$BABEL_PRESET_TS"
    echo "postinstall-patch: added allowDeclareFields to babel-preset-expo typescript config"
  fi
fi
