import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/newsletters/[id]/archive';

// Mock the Redis client
jest.mock('@/lib/redis', () => {
  const mockHgetall = jest.fn();
  const mockHset = jest.fn().mockResolvedValue(1);
  
  return {
    getRedisClient: jest.fn(() => ({
      hgetall: mockHgetall,
      hset: mockHset,
    })),
    mockHgetall,
    mockHset,
  };
});

// Mock the content cleaner
jest.mock('@/lib/cleaners/contentCleaner', () => ({
  cleanNewsletterContent: jest.fn().mockReturnValue({
    cleanedContent: '<p>Cleaned content</p>',
    removedItems: []
  })
}));

describe('Archive Endpoint', () => {
  let req: NextApiRequest & { query: { id: string }; body: any };
  let res: Partial<NextApiResponse> & { json: jest.Mock; status: jest.Mock };
  let mockHgetall: jest.Mock;
  let mockHset: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get the mock functions
    const { mockHgetall: mockHgetallFn, mockHset: mockHsetFn } = jest.requireMock('@/lib/redis');
    mockHgetall = mockHgetallFn;
    mockHset = mockHsetFn;
    
    // Setup default request
    req = {
      method: 'PUT',
      query: { id: 'test-newsletter-1' },
      body: {
        isArchived: true,
        content: '<div>Test content</div>'
      }
    } as any;

    // Setup default response
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    } as any;
    
    // Default mock implementation
    mockHgetall.mockResolvedValue({
      id: 'test-newsletter-1',
      title: 'Test Newsletter',
      metadata: JSON.stringify({ originalSource: 'test' })
    });
  });

  it('should archive a newsletter and clean its content', async () => {
    await handler(req, res as NextApiResponse);

    // Check response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        id: 'newsletter:test-newsletter-1',
        isArchived: true,
        previewText: expect.any(String)
      })
    );

    // Check that content cleaning was called
    const contentCleaner = await import('@/lib/cleaners/contentCleaner');
    expect(contentCleaner.cleanNewsletterContent).toHaveBeenCalledWith('<div>Test content</div>');
    
    // Check that Redis hset was called with the right data
    expect(mockHset).toHaveBeenCalledWith(
      'newsletter:test-newsletter-1',
      expect.objectContaining({
        content: '<p>Cleaned content</p>',
        cleanContent: '<p>Cleaned content</p>',
        isArchived: true,
        previewText: expect.any(String),
        metadata: expect.any(String)
      })
    );
  });

  it('should handle missing content', async () => {
    delete req.body.content;
    
    await handler(req, res as NextApiResponse);

    // Should still succeed but not call content cleaning
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockHset).toHaveBeenCalledWith(
      'newsletter:test-newsletter-1',
      expect.objectContaining({
        isArchived: true,
        archivedAt: expect.any(String)
      })
    );
    
    const { cleanNewsletterContent } = jest.requireMock('@/lib/cleaners/contentCleaner');
    expect(cleanNewsletterContent).not.toHaveBeenCalled();
  });
  
  it('should unarchive a newsletter', async () => {
    req.body.isArchived = false;
    
    await handler(req, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockHset).toHaveBeenCalledWith(
      'newsletter:test-newsletter-1',
      expect.objectContaining({
        isArchived: false,
        archivedAt: null
      })
    );
  });

  it('should handle newsletter not found', async () => {
    mockHgetall.mockResolvedValueOnce(null);
    
    await handler(req, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Newsletter not found'
      })
    );
  });

  it('should handle content cleaning errors', async () => {
    const { cleanNewsletterContent } = jest.requireMock('@/lib/cleaners/contentCleaner');
    cleanNewsletterContent.mockImplementationOnce(() => {
      throw new Error('Failed to clean content');
    });
    
    await handler(req, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Failed to process content'
      })
    );
  });

  it('should handle invalid HTTP methods', async () => {
    req.method = 'GET';
    
    await handler(req, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ message: 'Method not allowed' });
  });

  it('should handle Redis update errors', async () => {
    mockHset.mockRejectedValueOnce(new Error('Redis error'));
    
    await handler(req, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal server error'
      })
    );
  });
});
