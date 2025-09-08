#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fastGlob from "fast-glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Files to process
const filePatterns = [
  "components/**/*.{ts,tsx}",
  "lib/**/*.ts",
  "utils/**/*.ts",
  "pages/**/*.{ts,tsx}",
  "scripts/*.ts",
  "types/**/*.ts",
];

// Patterns to match import statements
const importPatterns = [
  // Match relative imports without .js extension
  /(import\s+.*?['"])(\.+\/)([^'"\n]+\.(?!js['"\n]))(?:['"])/g,
  // Match dynamic imports without .js extension
  /(import\s*\(\s*['"])(\.+\/)([^'"\n]+\.(?!js['"\n]))(?:['"]\s*\))/g,
];

async function processFile(filePath: string) {
  try {
    let content = await fs.promises.readFile(filePath, "utf-8");
    let modified = false;

    for (const pattern of importPatterns) {
      content = content.replace(pattern, (match, p1, p2, p3) => {
        // Skip if it's a type-only import or already has .js
        if (p1.includes("type ") || p3.endsWith(".d.ts")) {
          return match;
        }
        modified = true;
        return `${p1}${p2}${p3}.js${match.endsWith(")") ? ")" : ""}`;
      });
    }

    if (modified) {
      await fs.promises.writeFile(filePath, content, "utf-8");
      console.log(`Updated: ${path.relative(rootDir, filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function main() {
  const files = await fastGlob(filePatterns, {
    cwd: rootDir,
    absolute: true,
    ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
  });

  // Process each file
  for (const file of files) {
    await processFile(file);
  }

  console.log("Import paths updated successfully!");
}

main().catch(console.error);
