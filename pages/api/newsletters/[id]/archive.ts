import { NextApiRequest, NextApiResponse } from 'next';
import { updateNewsletterArchiveStatus } from '@/lib/redis';

type ArchiveRequest = NextApiRequest & {
  query: {
    id: string;
  };
  body: {
    isArchived?: boolean;
  };
};

export default async function handler(
  req: ArchiveRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'Invalid newsletter ID' });
  }

  try {
    // Default to true for consistency with read/unread behavior
    const { isArchived = true } = req.body;
    
    // Ensure we're using the correct ID format
    const newsletterId = id.startsWith('newsletter:') ? id : `newsletter:${id}`;
    console.log(`[API] Updating archive status for ID: ${id} (normalized to: ${newsletterId})`);
    
    const result = await updateNewsletterArchiveStatus(newsletterId, isArchived);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        details: result.details
      });
    }
    
    return res.status(200).json({
      success: true,
      isArchived,
      timestamp: result.data?.timestamp || new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[ERROR] Failed to update archive status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
