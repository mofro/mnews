import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/articles/[id]';
import { getRedisClient } from '../../lib/redis';

// Mock the Redis client
jest.mock('../../lib/redis', () => ({
  getRedisClient: jest.fn()
}));

describe('/api/articles/[id]', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should return 405 if method is not GET', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      query: { id: 'test-id' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ message: 'Method not allowed' });
  });

  it('should return 400 if ID is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: {}
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ message: 'Article ID is required' });
  });

  it('should return 404 if article is not found', async () => {
    const mockHgetall = jest.fn().mockResolvedValue({});
    (getRedisClient as jest.Mock).mockReturnValue({
      hgetall: mockHgetall
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'non-existent-id' }
    });

    await handler(req, res);

    expect(mockHgetall).toHaveBeenCalledWith('article:non-existent-id');
    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toEqual({ message: 'Article not found' });
  });

  it('should return article data if found', async () => {
    const mockArticle = {
      id: 'test-id',
      content: '<p>Test content</p>',
      rawContent: 'Test content',
      cleanContent: 'Test content',
      sender: 'Test Sender',
      subject: 'Test Subject',
      date: '2023-01-01T00:00:00.000Z'
    };

    const mockHgetall = jest.fn().mockResolvedValue({
      content: mockArticle.content,
      rawContent: mockArticle.rawContent,
      cleanContent: mockArticle.cleanContent,
      sender: mockArticle.sender,
      subject: mockArticle.subject,
      date: mockArticle.date
    });

    (getRedisClient as jest.Mock).mockReturnValue({
      hgetall: mockHgetall
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'test-id' }
    });

    await handler(req, res);

    expect(mockHgetall).toHaveBeenCalledWith('article:test-id');
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      id: 'test-id',
      content: mockArticle.content,
      rawContent: mockArticle.rawContent,
      cleanContent: mockArticle.cleanContent
    });
  });

  it('should handle Redis errors gracefully', async () => {
    const mockHgetall = jest.fn().mockRejectedValue(new Error('Redis error'));
    (getRedisClient as jest.Mock).mockReturnValue({
      hgetall: mockHgetall
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'test-id' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toMatchObject({
      message: 'Error fetching article',
      error: 'Redis error'
    });
  });
});
