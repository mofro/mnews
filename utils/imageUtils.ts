// utils/imageUtils.ts

// Unsplash configuration
const UNSPLASH_SOURCE = 'https://images.unsplash.com/photo-';
const IMAGE_WIDTH = 800;
const IMAGE_HEIGHT = 600;

// Curated list of high-quality Unsplash photo IDs
const UNSPLASH_PHOTOS = [
  // Technology
  '1526374965320-0f2a7430065b', '1498050108023-c5249f4df085', '1486312338219-ce68d2c6f44d',
  // Business
  '1460925895917-afdab827c52f', '1552664730-d307ca884978', '1552664199-fd1daa589c92',
  // Science
  'V0yAek0BgkE', 'Q_9ILGpB0v4', 'xG8IQMqB6Y8',
  // General
  '1497366754035-f200368a8e35', '1486312338219-ce68d2c6f44d', '1522071820081-009f3789a1d9'
];

interface ImageInfo {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    classList?: string[];
}

interface UnsplashImageOptions {
    width?: number;
    height?: number;
    grayscale?: boolean;
    blur?: 1 | 2 | 3 | 4 | 5;
    random?: boolean;
}
  
  export function extractFeaturedImage(htmlContent: string): string | null {
    try {
      if (typeof DOMParser === 'undefined') return null;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Get all images with their metadata
      const images = Array.from(doc.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || '',
        width: parseInt(img.width?.toString() || '0'),
        height: parseInt(img.height?.toString() || '0'),
        classList: Array.from(img.classList || [])
      }));
  
      // Filter out problematic images
      const validImages = images.filter(img => 
        img.src && 
        !isSocialMediaImage(img) &&
        !isIcon(img) &&
        !isTrackingPixel(img) &&
        !isBrokenImage(img) &&
        isImageUrlValid(img.src)
      );
  
      if (validImages.length === 0) return null;
  
      // Try to find hero/banner image
      const heroImage = validImages.find(img => 
        img.classList.some(c => c.includes('hero') || c.includes('banner') || c.includes('heroImage'))
      );
      if (heroImage) return heroImage.src;
  
      // Try to find first content image with reasonable size
      const contentImage = validImages.find(img => 
        (img.width >= 300 || img.height >= 150) &&
        (img.width / (img.height || 1) < 5)
      );
      if (contentImage) return contentImage.src;
  
      // Fallback to first valid image
      return validImages[0].src;
    } catch (error) {
      console.error('Error extracting featured image:', error);
      return null;
    }
  }
  
  // Helper functions for image filtering
  function isSocialMediaImage(img: ImageInfo): boolean {
    const socialDomains = [
      'facebook', 'twitter', 'linkedin', 'instagram', 
      'pinterest', 'youtube', 'tiktok', 'social'
    ];
    const hasSocialDomain = socialDomains.some(domain => 
      img.src.toLowerCase().includes(domain)
    );
    const hasSocialClass = img.classList ? 
      img.classList.some(c => c.includes('social')) : 
      false;
    return hasSocialDomain || hasSocialClass;
  }
  
  function isIcon(img: ImageInfo): boolean {
    const isSmallImage = (img.width > 0 && img.width < 50) || 
                        (img.height > 0 && img.height < 50);
    const hasIconClass = img.classList ? 
      img.classList.some(c => c.includes('icon') || c.includes('logo')) : 
      false;
    return isSmallImage || hasIconClass;
  }
  
  function isTrackingPixel(img: ImageInfo): boolean {
    return (img.width === 1 && img.height === 1) || 
           img.src.includes('pixel') ||
           img.src.includes('track') ||
           img.src.includes('beacon') ||
           img.src.includes('spacer');
  }
  
  function isBrokenImage(img: ImageInfo): boolean {
    const brokenPatterns = [
      'placeholder',
      'blank',
      'pixel',
      'spacer',
      'transparent',
      '1x1',
      'clear'
    ];
    return brokenPatterns.some(pattern => 
      img.src.toLowerCase().includes(pattern) ||
      (img.alt && img.alt.toLowerCase().includes(pattern))
    );
  }

  /**
   * Generate an Unsplash image URL based on search terms
   * @param query - Search terms (e.g., "technology", "nature")
   * @param options - Image options like width, height, etc.
   * @returns Unsplash image URL
   */
  export function getUnsplashImage(query: string = '', options: UnsplashImageOptions = {}): string {
    const { 
      width = IMAGE_WIDTH, 
      height = IMAGE_HEIGHT,
      grayscale = true,
      blur = 1
    } = options;

    // Select a random photo ID from our curated list
    const randomIndex = Math.floor(Math.random() * UNSPLASH_PHOTOS.length);
    const photoId = UNSPLASH_PHOTOS[randomIndex];
    
    // Build the URL with query parameters
    const params = new URLSearchParams();
    params.append('w', width.toString());
    params.append('h', height.toString());
    params.append('fit', 'crop');
    
    if (grayscale) {
      params.append('grayscale', '');
    }
    
    if (blur > 0 && blur <= 5) {
      params.append('blur', blur.toString());
    }
    
    // Quality and format
    params.append('q', '80');
    params.append('auto', 'format');
    
    return `${UNSPLASH_SOURCE}${photoId}?${params.toString()}`;
  }

  /**
   * Extract keywords from text for image search
   * @param text - Text to extract keywords from
   * @returns Array of relevant keywords
   */
  function extractKeywords(text: string): string[] {
    if (!text) return [];
    
    // Common words to exclude
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as', 'into', 'like',
      'through', 'after', 'over', 'between', 'out', 'against', 'during', 'before', 'after',
      'above', 'below', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
      'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
      'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn',
      'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn', 'mustn', 'needn',
      'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn'
    ]);

    // Extract words, remove punctuation, and filter out stop words
    return text
      .toLowerCase()
      .replace(/[^\w\s]|_/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Get a relevant Unsplash image URL for a given article title
   * @param title - Article title
   * @param options - Image options
   * @returns Unsplash image URL
   */
  export function getArticleImage(title: string = '', options: UnsplashImageOptions = {}): string {
    // Use a simpler approach with our curated list
    return getUnsplashImage('', {
      width: options.width || IMAGE_WIDTH,
      height: options.height || IMAGE_HEIGHT,
      grayscale: true,  // Always use grayscale for consistency
      blur: 1           // Slight blur for better text readability
    });
  }
  
  function isImageUrlValid(url: string): boolean {
    try {
      const { hostname, pathname } = new URL(url);
      const invalidExtensions = ['.svg', '.gif'];
      const hasInvalidExtension = invalidExtensions.some(ext => 
        pathname.toLowerCase().endsWith(ext)
      );
      return !hasInvalidExtension;
    } catch {
      return false;
    }
  }