const fs = require('fs').promises;
const path = require('path');

const filesToUpdate = [
  'pages/api/newsletters/[id]/preview.ts',
  'pages/api/test-redis.ts',
  'pages/api/newsletters/[id]/archive.ts',
  'pages/api/newsletters/[id]/read.ts',
  'scripts/list-newsletter-ids.ts',
  'lib/storage.ts',
  'pages/api/articles/[id].ts',
  'scripts/test-hdel.ts',
  '__tests_old__/api/articles.test.ts'
];

async function updateImports() {
  for (const file of filesToUpdate) {
    try {
      const filePath = path.join(process.cwd(), file);
      let content = await fs.readFile(filePath, 'utf8');
      
      // Update imports
      content = content.replace(
        /from\s+['"]@?\/?(?:\.\.\/)*lib\/redis['"]/g,
        'from "@/lib/redisClient"'
      );
      
      // Save the updated file
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Updated imports in ${file}`);
    } catch (error) {
      console.error(`❌ Error updating ${file}:`, error.message);
    }
  }
  
  console.log('\n✅ All files updated successfully!');
}

updateImports().catch(console.error);
