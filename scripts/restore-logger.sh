#!/bin/bash

# Script to restore log.info/error/warn from console equivalents
# and add back the logger import

# Find all TypeScript/JavaScript files that use console.log/error/warn
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./scripts/*" \
  -exec grep -l "console\.\(log\|error\|warn\)" {} \; | while read file; do
  
  echo "Processing: $file"
  
  # Check if the file already has the logger import
  if ! grep -q "import { log } from ['\"]~/utils/logger['\"]" "$file"; then
    # Find the last import statement line number
    last_import_line=$(grep -n "^import " "$file" | tail -1 | cut -d: -f1)
    
    if [ -n "$last_import_line" ]; then
      # Add the import after the last import
      sed -i '' "${last_import_line}a\\
import { log } from '~/utils/logger';
" "$file"
      echo "  Added logger import"
    else
      # No imports found, add at the beginning of the file
      sed -i '' "1i\\
import { log } from '~/utils/logger';\\

" "$file"
      echo "  Added logger import at top"
    fi
  fi
  
  # Replace console.log with log.info
  sed -i '' 's/console\.log/log.info/g' "$file"
  
  # Replace console.error with log.error
  sed -i '' 's/console\.error/log.error/g' "$file"
  
  # Replace console.warn with log.warn
  sed -i '' 's/console\.warn/log.warn/g' "$file"
  
done

echo "Done! All console calls replaced with logger."
