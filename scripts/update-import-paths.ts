#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Files to process
const filePatterns = [
  "lib/**/*.ts",
  "utils/**/*.ts",
  "scripts/*.ts",
  "pages/api/**/*.ts",
];

// Patterns to match import statements
const importPatterns = [
  // Match relative imports without .js extension
  /(import\s+.*?['"])(\.+\/)([^'"\n]+\.(?!js['"]))(?:['"])/g,
  // Match dynamic imports without .js extension
  /(import\s*\(\s*['"])(\.+\/)([^'"\n]+\.(?!js['"]))(?:['"]\s*\))/g,
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
  const files: string[] = [];

  // Find all files matching the patterns
  for (const pattern of filePatterns) {
    const matches = await glob(pattern, {
      cwd: rootDir,
      absolute: true,
      nodir: true,
    });
    files.push(...matches);
  }

  // Process each file
  for (const file of files) {
    await processFile(file);
  }

  console.log("Import paths updated successfully!");
}

// Simple glob implementation for this script
async function glob(
  pattern: string,
  options: { cwd: string; absolute: boolean; nodir: boolean },
): Promise<string[]> {
  const { default: fastGlob } = await import("fast-glob");
  return fastGlob(pattern, options);
}

main().catch(console.error);
