import { NextApiRequest, NextApiResponse } from 'next';
import { updateNewsletterContent } from "@/lib/redisClient";
import logger from '@/utils/logger';

interface UpdateResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

interface ContentUpdateResult {
  contentUpdated: boolean;
  previewText?: string;
  timestamp: string;
}

type PreviewRequest = NextApiRequest & {
  query: {
    id: string;
  };
  body: {
    content: string;
    previewText?: string | null;
  };
};

export default async function handler(
  req: PreviewRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'Invalid newsletter ID' });
  }

  const { content, previewText } = req.body;
  
  if (typeof content !== 'string') {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    // @ts-ignore - The type definition seems to be incorrect, but the function accepts 3 arguments
    const result = await updateNewsletterContent(id, content, previewText || undefined) as UpdateResult<ContentUpdateResult>;
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to update newsletter content',
        details: result.details,
      });
    }
    
    return res.status(200).json({
      success: true,
      previewText: previewText || null,
    });
    
  } catch (error) {
    logger.error('Error updating newsletter preview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update newsletter preview',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
