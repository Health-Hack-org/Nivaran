#!/usr/bin/env node

/**
 * ==============================================================================
 * NIVARAN Automated Theme & Contrast Audit Script
 * Evaluates WCAG 2.1 AA Contrast Compliance & Scans Codebase for Visibility Bugs
 * ==============================================================================
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Color conversion helpers
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function parseColor(str) {
  str = str.trim();
  if (str.startsWith("#")) {
    return hexToRgb(str);
  }
  if (str.startsWith("rgba") || str.startsWith("rgb")) {
    const parts = str.match(/\d+(\.\d+)?/g);
    if (parts && parts.length >= 3) {
      return {
        r: parseInt(parts[0], 10),
        g: parseInt(parts[1], 10),
        b: parseInt(parts[2], 10),
      };
    }
  }
  return { r: 0, g: 0, b: 0 };
}

// Calculate relative luminance according to WCAG 2.1 standard
function getLuminance({ r, g, b }) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// Calculate contrast ratio: (L1 + 0.05) / (L2 + 0.05)
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(parseColor(color1));
  const lum2 = getLuminance(parseColor(color2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Parse CSS Variables from globals.css
function parseThemeTokens(globalsCssPath) {
  const content = fs.readFileSync(globalsCssPath, "utf-8");
  const rootMatch = content.match(/:root\s*\{([\s\S]*?)\}/);
  const darkMatch = content.match(/html\.dark\s*\{([\s\S]*?)\}/);

  const extractVars = (cssBlock) => {
    const tokens = {};
    if (!cssBlock) return tokens;
    const lines = cssBlock.split("\n");
    for (const line of lines) {
      const match = line.match(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/);
      if (match) {
        tokens[match[1]] = match[2].trim();
      }
    }
    return tokens;
  };

  return {
    light: extractVars(rootMatch ? rootMatch[1] : ""),
    dark: extractVars(darkMatch ? darkMatch[1] : ""),
  };
}

console.log("\n=======================================================");
console.log(" 🌿 NIVARAN THEME & CONTRAST AUTOMATED AUDIT (WCAG AA)");
console.log("=======================================================\n");

const globalsPath = path.join(projectRoot, "src", "app", "globals.css");
if (!fs.existsSync(globalsPath)) {
  console.error("❌ globals.css not found at:", globalsPath);
  process.exit(1);
}

const tokens = parseThemeTokens(globalsPath);
let totalFailures = 0;

// Pairs to audit
const auditPairs = [
  { text: "foreground", bg: "background", name: "Body Text on Canvas", target: 4.5 },
  { text: "foreground-muted", bg: "background", name: "Muted Text on Canvas", target: 4.5 },
  { text: "card-foreground", bg: "card", name: "Card Text on Card Surface", target: 4.5 },
  { text: "modal-foreground", bg: "modal", name: "Modal Text on Modal Surface", target: 4.5 },
  { text: "primary-foreground", bg: "primary", name: "Button Text on Primary Button", target: 3.0 },
  { text: "secondary-foreground", bg: "secondary", name: "Button Text on Secondary Button", target: 3.0 },
  { text: "destructive-foreground", bg: "destructive", name: "Alert Text on Destructive Button", target: 3.0 },
];

console.log("--- 1. Evaluating Semantic Color Tokens (Light & Dark) ---");

["light", "dark"].forEach((mode) => {
  console.log(`\nMode: [${mode.toUpperCase()}]`);
  auditPairs.forEach((pair) => {
    const textColor = tokens[mode][pair.text];
    const bgColor = tokens[mode][pair.bg];

    if (!textColor || !bgColor) {
      console.log(`  ⚠️  ${pair.name}: Missing token definition (${pair.text} or ${pair.bg})`);
      return;
    }

    const ratio = getContrastRatio(textColor, bgColor);
    const passes = ratio >= pair.target;

    if (!passes) {
      totalFailures++;
      console.log(
        `  ❌ FAIL: ${pair.name} -> Ratio: ${ratio.toFixed(2)}:1 (Min required: ${pair.target}:1) [Text: ${textColor}, Bg: ${bgColor}]`
      );
    } else {
      console.log(
        `  ✅ PASS: ${pair.name.padEnd(35)} Ratio: ${ratio.toFixed(2)}:1 (Target: >= ${pair.target}:1)`
      );
    }
  });
});

console.log("\n--- 2. Scanning Codebase for Visibility Anti-Patterns ---");

const srcDir = path.join(projectRoot, "src");
const issues = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!file.startsWith(".") && file !== "node_modules") {
        scanDir(fullPath);
      }
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const relPath = path.relative(projectRoot, filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check 1: Hardcoded dark colors without dark: modifier
    if (
      line.includes("text-[#2A1503]") &&
      !line.includes("dark:text-") &&
      !line.includes("var(") &&
      !filePath.includes("ThemeToggle.tsx")
    ) {
      issues.push({
        file: relPath,
        line: lineNum,
        type: "HARDCODED_DARK_TEXT",
        msg: "Found 'text-[#2A1503]' without a 'dark:' variant. Use 'text-foreground' or 'dark:text-[#FAF6F0]'.",
      });
    }

    // Check 2: Low-opacity arbitrary white on elements without explicit dark bg
    if (
      line.includes("text-white/40") ||
      line.includes("text-white/50") ||
      line.includes("text-white/60")
    ) {
      // Allow if line also explicitly contains dark backgrounds
      if (!line.includes("bg-black") && !line.includes("bg-[#962D2D]") && !line.includes("bg-[#73543B]")) {
        issues.push({
          file: relPath,
          line: lineNum,
          type: "FAINT_WHITE_TEXT",
          msg: "Low-opacity white text ('text-white/...'). Risk of washed-out text in Light Mode. Use semantic token.",
        });
      }
    }
  });
}

scanDir(srcDir);

if (issues.length === 0) {
  console.log("  ✅ Zero visibility anti-patterns detected in source files!");
} else {
  console.log(`  ⚠️  Found ${issues.length} potential visibility warning(s):`);
  issues.slice(0, 10).forEach((issue) => {
    console.log(`    - [${issue.file}:${issue.line}] ${issue.msg}`);
  });
  if (issues.length > 10) {
    console.log(`    ... and ${issues.length - 10} more.`);
  }
}

console.log("\n=======================================================");
if (totalFailures === 0) {
  console.log(" 🎉 AUDIT PASSED: All semantic tokens meet WCAG AA contrast!");
} else {
  console.log(` ⚠️  AUDIT FLAGGED: ${totalFailures} token pairs below WCAG AA threshold.`);
}
console.log("=======================================================\n");

process.exit(totalFailures > 0 ? 1 : 0);

