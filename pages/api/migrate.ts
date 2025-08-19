// FILE: /pages/api/migrate.ts (CREATE NEW - Optional testing endpoint)
import type { NextApiRequest, NextApiResponse } from 'next';
import { NewsletterStorage } from '../../lib/storage';
// Inline logger implementation to avoid path resolution issues
const logger = {
  log: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  info: (...args: any[]) => console.info(...args),
  debug: (...args: any[]) => console.debug(...args)
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    logger.info('Triggering newsletter migration...');
    
    // Migration happens automatically when newsletters are fetched
    const newsletters = await NewsletterStorage.getAllNewsletters();
    
    const migrationStats = {
      total: newsletters.length,
      withRawContent: newsletters.filter(n => n.rawContent).length,
      withCleanContent: newsletters.filter(n => n.cleanContent).length,
      legacy: newsletters.filter(n => n.metadata.processingVersion === 'legacy-migrated').length
    };
    
    res.status(200).json({
      success: true,
      message: 'Migration completed automatically',
      stats: migrationStats
    });
  } catch (error) {
    logger.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}