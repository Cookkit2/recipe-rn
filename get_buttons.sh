#!/bin/bash
find components app -type f -name "*.tsx" | xargs grep -l "isLoading" | xargs grep -l "disabled"
