#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Convert kebab-case CSS variable name to camelCase JSON property name
 * @param {string} cssVarName - CSS variable name (e.g., "--primary-foreground")
 * @returns {string} - camelCase property name (e.g., "primaryForeground")
 */
function cssVarToCamelCase(cssVarName) {
  return cssVarName
    .replace(/^--/, '') // Remove -- prefix
    .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert OKLCH to HSL (approximate conversion)
 * This is a simplified conversion - for production use, consider using 'culori' library
 * @param {string} oklchValue - OKLCH color string
 * @returns {string} - HSL color string
 */
function oklchToHsl(oklchValue) {
  // Handle percentage opacity
  const opacityMatch = oklchValue.match(/oklch\([^)]+\s*\/\s*(\d+)%\)/);
  
  // Simple regex to extract OKLCH values
  const oklchMatch = oklchValue.match(/oklch\(([^)]+)\)/);
  if (!oklchMatch) {
    return oklchValue; // Return as-is if not OKLCH
  }

  const values = oklchMatch[1].split(/\s+/);
  
  if (values.length >= 3) {
    const l = parseFloat(values[0]); // Lightness (0-1)
    const c = parseFloat(values[1]); // Chroma (0+)
    const h = parseFloat(values[2]); // Hue (0-360)
    
    // Simplified OKLCH to HSL approximation
    // Note: This is not color-accurate, just for demonstration
    const hslH = Math.round(h || 0);
    const hslS = Math.round(Math.min(c * 100, 100));
    const hslL = Math.round(l * 100);
    
    if (opacityMatch) {
      return `hsla(${hslH} ${hslS}% ${hslL}% / ${opacityMatch[1]}%)`;
    }
    
    return `hsl(${hslH} ${hslS}% ${hslL}%)`;
  }
  
  return oklchValue;
}

/**
 * Parse CSS content and extract CSS variables with better regex support
 * @param {string} cssContent - CSS file content
 * @returns {Object} - Parsed CSS variables organized by theme
 */
function parseCssVariables(cssContent) {
  const result = {
    light: {},
    dark: {}
  };

  // Remove comments and normalize whitespace
  const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

  // More robust parsing for CSS blocks
  const parseBlock = (blockContent, theme) => {
    // Match CSS custom properties with various value formats
    const propertyRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let match;
    
    while ((match = propertyRegex.exec(blockContent)) !== null) {
      const varName = `--${match[1]}`;
      const varValue = match[2].trim();
      const camelCaseName = cssVarToCamelCase(varName);
      
      // Convert OKLCH to HSL, or keep original format
      result[theme][camelCaseName] = oklchToHsl(varValue);
    }
  };

  // Extract :root variables (light theme)
  const rootRegex = /:root\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gi;
  let rootMatch = rootRegex.exec(cleanCss);
  if (rootMatch) {
    parseBlock(rootMatch[1], 'light');
  }

  // Extract .dark variables (dark theme)
  const darkRegex = /\.dark\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gi;
  let darkMatch = darkRegex.exec(cleanCss);
  if (darkMatch) {
    parseBlock(darkMatch[1], 'dark');
  }

  return result;
}

/**
 * Merge with existing JSON file if it exists
 * @param {string} jsonFilePath - Path to JSON file
 * @param {Object} newData - New data to merge
 * @param {boolean} overwrite - Whether to overwrite existing values
 * @returns {Object} - Merged data
 */
function mergeWithExisting(jsonFilePath, newData, overwrite = false) {
  if (!fs.existsSync(jsonFilePath)) {
    return newData;
  }

  try {
    const existingContent = fs.readFileSync(jsonFilePath, 'utf8');
    const existingData = JSON.parse(existingContent);
    
    if (!overwrite) {
      // Merge without overwriting existing values
      const merged = { ...existingData };
      
      Object.keys(newData).forEach(theme => {
        if (!merged[theme]) merged[theme] = {};
        
        Object.keys(newData[theme]).forEach(key => {
          if (!merged[theme][key]) {
            merged[theme][key] = newData[theme][key];
          }
        });
      });
      
      return merged;
    }
    
    // Deep merge with overwrite
    return {
      ...existingData,
      ...newData,
      light: { ...existingData.light, ...newData.light },
      dark: { ...existingData.dark, ...newData.dark }
    };
    
  } catch (error) {
    console.warn(`⚠️  Could not parse existing JSON file: ${error.message}`);
    return newData;
  }
}

/**
 * Convert CSS file to JSON format with advanced options
 * @param {string} cssFilePath - Path to CSS file
 * @param {string} jsonFilePath - Path to output JSON file
 * @param {Object} options - Conversion options
 */
function convertCssToJson(cssFilePath, jsonFilePath, options = {}) {
  const {
    merge = false,
    overwrite = false,
    convertColors = true,
    backup = true,
    prettify = true
  } = options;

  try {
    // Create backup if requested and file exists
    if (backup && fs.existsSync(jsonFilePath)) {
      const backupPath = `${jsonFilePath}.backup.${Date.now()}`;
      fs.copyFileSync(jsonFilePath, backupPath);
      console.log(`💾 Created backup: ${backupPath}`);
    }

    // Read CSS file
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    
    // Parse CSS variables
    const parsedVars = parseCssVariables(cssContent);
    
    // Merge with existing if requested
    const finalData = merge ? mergeWithExisting(jsonFilePath, parsedVars, overwrite) : parsedVars;
    
    // Convert to JSON
    const jsonContent = prettify 
      ? JSON.stringify(finalData, null, 2)
      : JSON.stringify(finalData);
    
    // Write to JSON file
    fs.writeFileSync(jsonFilePath, jsonContent);
    
    console.log(`✅ Successfully converted ${cssFilePath} to ${jsonFilePath}`);
    console.log(`📊 Light theme: ${Object.keys(finalData.light || {}).length} variables`);
    console.log(`📊 Dark theme: ${Object.keys(finalData.dark || {}).length} variables`);
    
    // Show preview of variables
    console.log('\n📋 Preview:');
    if (finalData.light) {
      const lightKeys = Object.keys(finalData.light).slice(0, 3);
      lightKeys.forEach(key => {
        console.log(`  light.${key}: ${finalData.light[key]}`);
      });
    }
    
    if (finalData.dark && Object.keys(finalData.dark).length > 0) {
      const darkKeys = Object.keys(finalData.dark).slice(0, 3);
      darkKeys.forEach(key => {
        console.log(`  dark.${key}: ${finalData.dark[key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error converting CSS to JSON:', error.message);
    process.exit(1);
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    merge: args.includes('--merge'),
    overwrite: args.includes('--overwrite'),
    convertColors: !args.includes('--no-color-conversion'),
    backup: !args.includes('--no-backup'),
    prettify: !args.includes('--minify')
  };
  
  // Remove flags from args
  const fileArgs = args.filter(arg => !arg.startsWith('--'));
  
  if (fileArgs.length < 2) {
    console.log(`
📝 Advanced CSS to JSON Converter

Usage: node css-to-json-converter-advanced.js [options] <input-css-file> <output-json-file>

Options:
  --merge                Merge with existing JSON file
  --overwrite           Overwrite existing values when merging
  --no-color-conversion  Keep original color format (don't convert OKLCH to HSL)
  --no-backup           Don't create backup of existing JSON file
  --minify              Minify JSON output

Examples:
  node css-to-json-converter-advanced.js global.css colors.json
  node css-to-json-converter-advanced.js --merge --backup global.css constants/colors.json
  node css-to-json-converter-advanced.js --overwrite global.css colors.json

Features:
  ✨ Converts CSS custom properties to JSON
  🎨 Supports :root and .dark themes  
  🐪 Converts kebab-case to camelCase
  🎯 OKLCH to HSL color conversion
  🔄 Merge with existing JSON files
  💾 Automatic backup creation
  🛡️  Robust CSS parsing
    `);
    process.exit(1);
  }

  const [inputFile, outputFile] = fileArgs;
  
  // Resolve file paths
  const cssFilePath = path.resolve(inputFile);
  const jsonFilePath = path.resolve(outputFile);
  
  // Check if input file exists
  if (!fs.existsSync(cssFilePath)) {
    console.error(`❌ Input file not found: ${cssFilePath}`);
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(jsonFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`🔄 Converting ${cssFilePath} to ${jsonFilePath}...`);
  console.log(`⚙️  Options: ${JSON.stringify(options, null, 2)}`);
  
  convertCssToJson(cssFilePath, jsonFilePath, options);
}

// Export functions for potential use as module
module.exports = {
  convertCssToJson,
  parseCssVariables,
  cssVarToCamelCase,
  oklchToHsl,
  mergeWithExisting
};

// Run if called directly
if (require.main === module) {
  main();
}
