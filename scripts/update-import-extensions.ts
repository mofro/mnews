import fs from "fs";
import path from "path";

// File extensions to process (in order of preference)
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

// Directories to process
const DIRECTORIES = [
  "pages",
  "components",
  "lib",
  "utils",
  "scripts",
  "types",
  "styles",
];

// Regex patterns
const IMPORT_PATTERN = /from\s+['"]([.][.\\/]*\/?(?:[\w-\/]+))['"]/g;
const LOCAL_IMPORT_PATTERN = /^[.][.\\/]/;

// Files that should always use .js extensions in imports
const ALWAYS_USE_JS_EXTENSION = [/\/pages\/api\//, /\/lib\//, /\/utils\//];

// Files that should never have extensions in imports
const NEVER_USE_EXTENSION = [/\/node_modules\//, /\/public\//];

// Track processed files
let processedFiles = 0;
let updatedImports = 0;

function shouldUseJsExtension(filePath: string): boolean {
  // Check if this file should always use .js extensions
  return ALWAYS_USE_JS_EXTENSION.some((pattern) => pattern.test(filePath));
}

function shouldSkipExtension(filePath: string): boolean {
  // Check if this file should never have extensions
  return NEVER_USE_EXTENSION.some((pattern) => pattern.test(filePath));
}

function resolveImportPath(
  importPath: string,
  filePath: string,
): { path: string; needsUpdate: boolean } {
  // Skip if it's a package import or already has an extension
  if (
    !LOCAL_IMPORT_PATTERN.test(importPath) ||
    importPath.match(/\.[a-z0-9]+$/i)
  ) {
    return { path: importPath, needsUpdate: false };
  }

  const dir = path.dirname(filePath);
  const importFullPath = path.join(dir, importPath);

  // Special handling for directory imports
  if (
    fs.existsSync(importFullPath) &&
    fs.statSync(importFullPath).isDirectory()
  ) {
    const indexPath = path.join(importFullPath, "index");
    for (const ext of EXTENSIONS) {
      if (fs.existsSync(`${indexPath}${ext}`)) {
        return {
          path: `${importPath}/index${shouldUseJsExtension(filePath) ? ".js" : ""}`,
          needsUpdate: true,
        };
      }
    }
  }

  // Check for direct file imports
  for (const ext of EXTENSIONS) {
    const testPath = `${importFullPath}${ext}`;
    if (fs.existsSync(testPath)) {
      // For TypeScript files in certain directories, use .js in imports
      const isTypeScriptFile = [".ts", ".tsx"].includes(ext);
      const shouldUseJs = shouldUseJsExtension(filePath) || isTypeScriptFile;
      const newExt = shouldUseJs ? ".js" : ext;

      return {
        path: shouldSkipExtension(filePath)
          ? importPath
          : `${importPath}${newExt}`,
        needsUpdate: true,
      };
    }
  }

  return { path: importPath, needsUpdate: false };
}

function processFile(filePath: string) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let updated = false;

    // Process import statements
    const updatedContent = content.replace(
      IMPORT_PATTERN,
      (match, importPath) => {
        const result = resolveImportPath(importPath, filePath);
        if (result.needsUpdate) {
          updated = true;
          updatedImports++;
          return `from '${result.path}'`;
        }
        return match;
      },
    );

    // Write back if changes were made
    if (updated) {
      fs.writeFileSync(filePath, updatedContent, "utf8");
      processedFiles++;
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

function processDirectory(directory: string) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (
      entry.isFile() &&
      EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
    ) {
      processFile(fullPath);
    }
  }
}

// Run the script
console.log("Updating import extensions...");

for (const dir of DIRECTORIES) {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  } else {
    console.warn(`Directory not found: ${dir}`);
  }
}

console.log(`\nProcess complete!`);
console.log(`- Processed files: ${processedFiles}`);
console.log(`- Updated imports: ${updatedImports}`);
