# Content Processing Refactor Plan

## Current Issues

1. **Broken Content Display**: Core functionality is not working
   - ✅ **Fixed**: Removed content truncation in multiple locations:
     - `contentProcessor.ts`: Removed substring truncation in processing steps
     - `ArticleGridCard.tsx`: Removed preview text truncation
     - `newsletters.ts` API: Stopped truncating `cleanContent` in response
     - `[id].ts` API: Removed debug log truncation
   - Now preserves full content throughout the pipeline

2. **Duplicated Logic**: Processing exists in both `contentProcessor` and `FullViewArticle`
   - ⚠️ **Partially Addressed**: Centralized in `contentProcessor` but needs cleanup

3. **Inconsistent Processing**: Multiple code paths for similar operations
   - ⚠️ **In Progress**: Being addressed through lazy loading implementation

4. **Tight Coupling**: Display logic mixed with content processing
   - 🔄 **Pending**: Will be addressed in Phase 2

## Phase 1: Immediate Fixes (Critical Path) - COMPLETED

- [x] Fix content display in `FullViewArticle`
  - [x] Ensure content is being passed correctly
    - Verified full content flow from API to component
  - [x] Remove any processing that breaks rendering
    - Removed all content truncation in processing pipeline
  - [x] Add minimal error boundaries
    - Added error handling in content processing
  - [x] Verify basic rendering works
    - Confirmed full content displays correctly

## Phase 2: Architecture Cleanup (IN PROGRESS)

- [x] Audit all content processing in `FullViewArticle`
- [ ] Move processing logic to `contentProcessor.ts`
  - [x] Content selection and prioritization
  - [x] HTML sanitization
  - [ ] DOM manipulation (links, images)
  - [ ] Content structure normalization
- [ ] Update `FullViewArticle` to be presentational only
- [ ] Ensure type safety throughout the pipeline

## Phase 3: Lazy Loading Implementation

See [Lazy Loading Implementation Plan](./lazy_loading_implementation.md) for full details.

- [ ] Backend Changes
  - [ ] Create content summarization utility
  - [ ] Update Redis storage to handle summaries
  - [ ] Implement new content API endpoint
  - [ ] Update webhook handler

## Phase 4: Testing & Validation

- [ ] Create test cases for different content scenarios
- [ ] Verify all edge cases
- [ ] Performance testing
- [ ] Cross-browser validation

## Phase 5: Documentation

- [ ] Document the content processing pipeline
- [ ] Add JSDoc for all public functions
- [ ] Create examples for common use cases

## Key Architectural Decisions

1. **Content Preservation**
   - Full content is now preserved throughout the system
   - Truncation only happens at display time in the UI
   - All processing steps maintain content integrity

2. **Processing Pipeline**
   - Centralized in `contentProcessor.ts`
   - Each processing step is isolated and testable
   - Maintains type safety throughout

3. **Lazy Loading Strategy**
   - Summary content for list views
   - Full content loaded on demand
   - Efficient Redis storage structure
