import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";

// File extensions to process
const EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

// Path aliases to handle
const ALIASES = {
  "@/components": "./components",
  "@/lib": "./lib",
  "@/utils": "./utils",
  "@/types": "./types",
  "@/context": "./context",
  "@": ".",
};

// Regex to match import/require statements
const IMPORT_REGEX =
  /(?:import|export)(?:\s+[\w*{}\n, ]+\s+from\s*)?\s*['"]([^'"]+)['"]/g;

async function processFile(filePath: string) {
  try {
    const content = await readFile(filePath, "utf-8");
    let modified = false;
    let newContent = content;

    // Process each import/export statement
    newContent = newContent.replace(IMPORT_REGEX, (match, importPath) => {
      // Skip node_modules and built-in modules
      if (
        importPath.startsWith(".") ||
        Object.keys(ALIASES).some((alias) => importPath.startsWith(alias))
      ) {
        // Remove .js/.ts extensions
        const newImportPath = importPath
          .replace(/\.(js|ts|jsx|tsx)$/, "")
          .replace(/\.(mjs|cjs)$/, "");

        // Update path aliases
        let finalPath = newImportPath;
        for (const [alias, replacement] of Object.entries(ALIASES)) {
          if (newImportPath.startsWith(alias)) {
            finalPath = newImportPath.replace(alias, replacement);
            break;
          }
        }

        if (finalPath !== importPath) {
          modified = true;
          return match.replace(importPath, finalPath);
        }
      }
      return match;
    });

    if (modified) {
      await writeFile(filePath, newContent, "utf-8");
      console.log(`Updated imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function main() {
  try {
    const patterns = EXTENSIONS.map((ext) => `**/*.${ext}`);
    const files = await glob(patterns, {
      ignore: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    });

    console.log(`Found ${files.length} files to process`);

    for (const file of files) {
      await processFile(path.resolve(process.cwd(), file));
    }

    console.log("Import path update complete!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
