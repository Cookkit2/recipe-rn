#!/bin/bash

# Script to replace log.info/error/warn with console equivalents
# and remove the logger import

# Find all TypeScript/JavaScript files and process them
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -name "replace-logger.sh" \
  -exec grep -l "log\.\(info\|error\|warn\)" {} \; | while read file; do
  
  echo "Processing: $file"
  
  # Replace log.info with console.log
  sed -i '' 's/log\.info/console.log/g' "$file"
  
  # Replace log.error with console.error
  sed -i '' 's/log\.error/console.error/g' "$file"
  
  # Replace log.warn with console.warn
  sed -i '' 's/log\.warn/console.warn/g' "$file"
  
  # Remove the import line for the logger
  sed -i '' "/import { log } from ['\"]~\/utils\/logger['\"];/d" "$file"
  
done

# Also check files that only have the import but no log calls
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec grep -l "import { log } from ['\"]~/utils/logger['\"]" {} \; 2>/dev/null | while read file; do
  
  echo "Removing import from: $file"
  sed -i '' "/import { log } from ['\"]~\/utils\/logger['\"];/d" "$file"
  
done

echo "Done! All occurrences replaced."
