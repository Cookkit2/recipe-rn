# CSS to JSON Converter Scripts

This directory contains three different scripts to convert CSS custom properties (CSS variables) to JSON format, specifically designed for your color system.

## Scripts Available

### 1. Basic Converter (`css-to-json-converter.js`)
Simple Node.js script for basic CSS to JSON conversion.

```bash
# Basic usage
node scripts/css-to-json-converter.js global.css colors.json

# Make it executable and run directly
chmod +x scripts/css-to-json-converter.js
./scripts/css-to-json-converter.js global.css colors.json
```

### 2. Advanced Converter (`css-to-json-converter-advanced.js`)  
Enhanced Node.js script with more features and options.

```bash
# Basic usage
node scripts/css-to-json-converter-advanced.js global.css colors.json

# With options
node scripts/css-to-json-converter-advanced.js --merge --backup global.css constants/colors.json

# Available options:
# --merge                Merge with existing JSON file
# --overwrite           Overwrite existing values when merging  
# --no-color-conversion  Keep original color format
# --no-backup           Don't create backup of existing JSON file
# --minify              Minify JSON output
```

### 3. Python Converter (`css-to-json-converter.py`)
Python version with robust parsing and better color conversion.

```bash
# Basic usage  
python3 scripts/css-to-json-converter.py global.css colors.json

# With options
python3 scripts/css-to-json-converter.py --merge --backup global.css constants/colors.json

# Available options:
# --merge              Merge with existing JSON file
# --overwrite         Overwrite existing values when merging
# --no-backup         Don't create backup of existing JSON file  
# --minify            Minify JSON output
```

## Features

### ✨ Core Features
- **CSS Variable Extraction**: Parses `:root` and `.dark` CSS selectors
- **Theme Support**: Organizes colors into `light` and `dark` themes
- **Property Conversion**: Converts `--kebab-case` to `camelCase`
- **Color Format Support**: Handles OKLCH, HSL, and other CSS color formats

### 🎨 Color Conversion
- **OKLCH to HSL**: Converts modern OKLCH colors to HSL format
- **Opacity Support**: Handles colors with alpha/opacity values
- **Format Preservation**: Keeps non-OKLCH colors in original format

### 🔧 Advanced Features (Advanced & Python versions)
- **Merge Mode**: Combine with existing JSON files without overwriting
- **Backup Creation**: Automatically backup existing files before changes
- **Robust Parsing**: Handle complex CSS with nested rules and comments
- **Error Handling**: Graceful error handling with helpful messages

## Example Output

Input CSS:
```css
:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.705 0.213 47.604);
  --border: oklch(0.92 0.004 286.32);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --primary: oklch(0.646 0.222 41.116);
  --border: oklch(1 0 0 / 10%);
}
```

Output JSON:
```json
{
  "light": {
    "background": "oklch(1 0 0)",
    "primary": "oklch(0.705 0.213 47.604)", 
    "border": "oklch(0.92 0.004 286.32)"
  },
  "dark": {
    "background": "oklch(0.141 0.005 285.823)",
    "primary": "oklch(0.646 0.222 41.116)",
    "border": "oklch(1 0 0 / 10%)"
  }
}
```

## Quick Start

To convert your current `global.css` to update your `constants/colors.json`:

```bash
# Option 1: Basic conversion (replaces file)
node scripts/css-to-json-converter.js global.css constants/colors.json

# Option 2: Safe merge with backup
node scripts/css-to-json-converter-advanced.js --merge --backup global.css constants/colors.json

# Option 3: Python version with merge
python3 scripts/css-to-json-converter.py --merge --backup global.css constants/colors.json
```

## Test Results

✅ Successfully tested with your current files:
- **Input**: `global.css` (120 lines)
- **Output**: 27 light theme variables, 26 dark theme variables
- **Formats**: Handles OKLCH, opacity values, and all your current CSS variables

## Color Conversion Notes

The scripts include basic OKLCH to HSL conversion. For production use with color-critical applications, consider using specialized color libraries like:
- JavaScript: `culori` library
- Python: `colorspacious` library

For most UI purposes, the current conversion is sufficient and maintains visual consistency.
