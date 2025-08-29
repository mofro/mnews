/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react');
const { render, screen, waitFor } = require('@testing-library/react');
const { FullViewArticle } = require('@/components/article/FullViewArticle');
require('@testing-library/jest-dom');

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image(props: any) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return React.createElement('img', props);
  },
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: (html: string) => html, // Return the HTML as-is for testing
}));

describe('FullViewArticle', () => {
  const mockArticle = {
    id: 'test-article',
    title: 'Test Article',
    content: '<p>Test content</p>',
    publishDate: '2023-01-01T00:00:00.000Z',
    sender: 'Test Sender',
    tags: ['test', 'article'],
    imageUrl: 'https://example.com/image.jpg',
    isRead: false,
    isArchived: false,
  };

  const mockOnClose = jest.fn();
  const mockOnToggleRead = jest.fn();
  const mockOnToggleArchive = jest.fn();
  const mockOnShare = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch
    global.fetch = jest.fn() as jest.Mock;
  });

  it('renders loading state initially', () => {
    render(
      <FullViewArticle
        article={{ ...mockArticle, content: '', isLoading: true }}
        onClose={mockOnClose}
        onToggleRead={mockOnToggleRead}
        onToggleArchive={mockOnToggleArchive}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByText('Loading article content...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state when content fails to load', () => {
    render(
      <FullViewArticle
        article={{ ...mockArticle, content: '', error: 'Failed to load', isLoading: false }}
        onClose={mockOnClose}
        onToggleRead={mockOnToggleRead}
        onToggleArchive={mockOnToggleArchive}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByText(/Error loading content/)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders article content when loaded', async () => {
    render(
      <FullViewArticle
        article={mockArticle}
        onClose={mockOnClose}
        onToggleRead={mockOnToggleRead}
        onToggleArchive={mockOnToggleArchive}
        onShare={mockOnShare}
      />
    );

    // Check that the content is rendered
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test Sender')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
    
    // Check that tags are rendered
    expect(screen.getByText('#test')).toBeInTheDocument();
    expect(screen.getByText('#article')).toBeInTheDocument();
  });

  it('fetches content on mount if not provided', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'test-article',
        content: '<p>Fetched content</p>',
        cleanContent: 'Fetched content',
        rawContent: 'Fetched content',
      }),
    });
    
    global.fetch = mockFetch as jest.Mock;

    render(
      <FullViewArticle
        article={{ ...mockArticle, content: '' }}
        onClose={mockOnClose}
        onToggleRead={mockOnToggleRead}
        onToggleArchive={mockOnToggleArchive}
        onShare={mockOnShare}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading article content...')).toBeInTheDocument();

    // Wait for content to be fetched and rendered
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/articles/test-article');
      // The content should be rendered after fetch completes
      expect(screen.getByText('Fetched content')).toBeInTheDocument();
    });
  });

  it('handles fetch errors gracefully', async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));
    global.fetch = mockFetch as jest.Mock;

    render(
      <FullViewArticle
        article={{ ...mockArticle, content: '' }}
        onClose={mockOnClose}
        onToggleRead={mockOnToggleRead}
        onToggleArchive={mockOnToggleArchive}
        onShare={mockOnShare}
      />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading article content...')).toBeInTheDocument();

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.getByText(/Error loading content/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
