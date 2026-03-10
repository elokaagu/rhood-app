#!/usr/bin/env node

/**
 * Performance check script for RhoodApp
 * Scans the codebase for common performance issues (list rendering, component size, patterns).
 * Run from project root: node scripts/performance-check.js
 * Does not modify any files.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.join(ROOT, "components");
const APP_JS = path.join(ROOT, "App.js");
const LIB = path.join(ROOT, "lib");

const issues = [];
const warnings = [];
const ok = [];

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    return "";
  }
}

function lineCount(content) {
  return (content.match(/\n/g) || []).length + (content.length > 0 ? 1 : 0);
}

function scanFile(filePath, content, relativePath) {
  const lines = lineCount(content);

  // Very large files
  if (lines > 2000) {
    issues.push({
      file: relativePath,
      type: "large_file",
      message: `File is ${lines} lines; consider splitting into smaller components.`,
    });
  } else if (lines > 800) {
    warnings.push({
      file: relativePath,
      type: "large_file",
      message: `File is ${lines} lines.`,
    });
  }

  // ScrollView + .map( in same file → likely non-virtualized list
  const hasScrollView = /ScrollView/.test(content);
  const hasMapInRender = /\.map\s*\(\s*\([^)]*\)\s*=>/.test(content);
  if (hasScrollView && hasMapInRender && !content.includes("FlatList")) {
    warnings.push({
      file: relativePath,
      type: "scrollview_map",
      message: "Uses ScrollView and .map(); consider FlatList for long lists.",
    });
  }
  if (hasScrollView && hasMapInRender && /<FlatList[\s>]/.test(content)) {
    ok.push({
      file: relativePath,
      type: "has_flatlist",
      message: "Uses FlatList (and ScrollView/.map elsewhere).",
    });
  }

  // FlatList without performance props (only when <FlatList is actually used)
  if (/<FlatList[\s>]/.test(content)) {
    const hasInitialNumToRender = /initialNumToRender\s*=\{/.test(content);
    const hasWindowSize = /windowSize\s*=\{/.test(content);
    if (!hasInitialNumToRender || !hasWindowSize) {
      issues.push({
        file: relativePath,
        type: "flatlist_untuned",
        message:
          "FlatList used but missing initialNumToRender or windowSize (use lib/performanceConstants LIST_PERFORMANCE).",
      });
    } else {
      ok.push({
        file: relativePath,
        type: "flatlist_tuned",
        message: "FlatList has performance props.",
      });
    }
  }

  // createGestureHandlers() called in render (App.js)
  if (relativePath === "App.js" && /createGestureHandlers\s*\(\s*\)/.test(content)) {
    issues.push({
      file: relativePath,
      type: "gesture_recreated",
      message: "createGestureHandlers() is called in render; memoize or useRef to avoid recreating PanResponder every render.",
    });
  }

  // React.memo on screen components (good)
  if (content.includes("React.memo") || content.includes("memo(")) {
    ok.push({
      file: relativePath,
      type: "memo_used",
      message: "Uses React.memo.",
    });
  }
}

// Scan App.js
const appContent = readFile(APP_JS);
if (appContent) {
  scanFile(APP_JS, appContent, "App.js");
}

// Scan components
try {
  const files = fs.readdirSync(COMPONENTS);
  for (const name of files) {
    if (!name.endsWith(".js")) continue;
    const full = path.join(COMPONENTS, name);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    const content = readFile(full);
    scanFile(full, content, `components/${name}`);
  }
} catch (e) {
  console.error("Could not read components dir:", e.message);
}

// Report
console.log("\n=== RhoodApp performance check ===\n");

if (issues.length > 0) {
  console.log("Issues (recommended to fix):");
  issues.forEach(({ file, message }) => console.log(`  [${file}] ${message}`));
  console.log("");
}

if (warnings.length > 0) {
  console.log("Warnings (review when possible):");
  warnings.forEach(({ file, message }) => console.log(`  [${file}] ${message}`));
  console.log("");
}

if (ok.length > 0) {
  console.log("Good practices found:");
  const byType = {};
  ok.forEach(({ type, file }) => {
    if (!byType[type]) byType[type] = [];
    byType[type].push(file);
  });
  Object.entries(byType).forEach(([type, files]) => {
    console.log(`  ${type}: ${files.join(", ")}`);
  });
  console.log("");
}

console.log("Summary:");
console.log(`  Issues:   ${issues.length}`);
console.log(`  Warnings: ${warnings.length}`);
console.log("\nSee PERFORMANCE_AUDIT.md for detailed recommendations and priority order.\n");

process.exit(issues.length > 0 ? 1 : 0);
