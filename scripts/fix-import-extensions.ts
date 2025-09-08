import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";

// File extensions to process
const EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

// Regex to match import/require statements
const IMPORT_REGEX =
  /(?:import|export)(?:\s+[\w*{}\n, ]+\s+from\s*)?\s*['"]([^'"]+)['"]/g;

// Check if a path is a relative import (starts with ./ or ../)
function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith("./") || importPath.startsWith("../");
}

// Check if a path already has an extension
function hasExtension(importPath: string): boolean {
  return /\.[a-zA-Z0-9]+$/.test(importPath);
}

// Process a single file
async function processFile(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, "utf-8");
    let modified = false;

    // Process each import/export statement
    const newContent = content.replace(IMPORT_REGEX, (match, importPath) => {
      // Skip node_modules and built-in modules
      if (isRelativeImport(importPath) && !hasExtension(importPath)) {
        modified = true;
        return match.replace(importPath, `${importPath}.js`);
      }
      return match;
    });

    if (modified) {
      await writeFile(filePath, newContent, "utf-8");
      console.log(
        `Updated imports in ${path.relative(process.cwd(), filePath)}`,
      );
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Main function
async function main() {
  try {
    const patterns = EXTENSIONS.map((ext) => `**/*.${ext}`);
    const files = await glob(patterns, {
      ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/*.d.ts"],
    });

    console.log(`Found ${files.length} files to process`);

    for (const file of files) {
      await processFile(path.resolve(process.cwd(), file));
    }

    console.log("Import extension update complete!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
