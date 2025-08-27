# Article Viewing UX Specification

## Overview

This document outlines the implementation details of the popup-only article viewing experience in the application.

## Implementation Status

✅ **Completed** - Popup-only article viewing is fully implemented and in production.

## Core Components

### 1. ArticleGridCard

- Handles click/tap interactions
- Triggers `onExpand` callback with article data
- Prevents event propagation on interactive elements (share, read, archive)

### 2. FullViewArticle (Popup Modal)

- Displays article content in a centered modal
- Handles keyboard navigation (Escape to close)
- Locks body scroll when open
- Implements proper ARIA attributes for accessibility
- Supports theme switching (light/dark mode)

### 3. Parent Component (pages/index.tsx)

- Manages article state
- Handles callbacks for read/archive/share actions
- Controls modal visibility

## User Flow

1. User clicks/taps on an article card
2. `ArticleGridCard` triggers `onExpand` callback
3. Parent component updates state to show the modal
4. `FullViewArticle` renders with article content
5. User can:
   - Scroll through content
   - Use keyboard navigation
   - Toggle read/archive status
   - Share the article
   - Close the modal (click outside, Escape key, or close button)

## Technical Implementation

### State Management

```typescript
// In parent component (e.g., pages/index.tsx)
const [fullViewArticle, setFullViewArticle] = useState<Article | null>(null);

// Open modal
const handleExpandArticle = (article: Article) => {
  setFullViewArticle(article);
};

// Close modal
const handleCloseFullView = () => {
  setFullViewArticle(null);
};
```

### Accessibility Features

- Modal has `role="dialog"` and `aria-modal="true"`
- Focus is trapped within the modal when open
- Escape key closes the modal
- Clicking outside the modal content closes it
- Proper heading structure for screen readers

## Performance Considerations

- Modal content is only rendered when needed
- Images are lazy-loaded
- Smooth animations using CSS transitions
- Memoized components where appropriate

## Future Enhancements

- [ ] Add swipe gestures for mobile navigation
- [ ] Implement keyboard navigation between articles
- [ ] Add article loading states
- [ ] Support for article search within the modal
