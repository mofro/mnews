# Architectural Decision Record: Modular Pattern Detection System

## Status

**APPROVED** - Ready for implementation

## Context

The initial footnote link implementation revealed a fundamental challenge: newsletter HTML varies dramatically across platforms (Substack, ConvertKit, Mailchimp, custom solutions). A one-size-fits-all filtering approach creates a classic trade-off dilemma:

- **Conservative filtering**: Leaves email infrastructure cruft (subscription widgets, social buttons, tracking)
- **Aggressive filtering**: Risks removing legitimate content (author bios, important links, formatting)

As noted by Mo during team analysis: *"We keep talking about this problem as if there were a SINGLE answer... As if one newsletter with a different paradigm can break any implementation we create."*

The system needs to learn and adapt to different newsletter patterns rather than applying uniform filtering rules.

## Decision

We will implement a **Modular Pattern Detection System** with the following architecture:

### 1. Progressive Pattern Learning

- Start with blank patterns for unknown domains
- Apply smart defaults for initial processing
- Learn domain-specific patterns from actual newsletter structures
- Build institutional knowledge that improves over time

### 2. Modular Filter Categories

- **Metadata Filtering**: Email headers, tracking pixels, delivery info
- **Attribution Block Filtering**: Author/publication branding cleanup
- **Social Elements Filtering**: Like/share/comment buttons
- **Subscription Widget Filtering**: Signup forms, promotional content
- **Navigation Filtering**: "Read in App", platform navigation
- **CSS Filtering**: Platform-specific style cleanup
- **Generic Content Filtering**: Basic HTML cleanup (always applied)
- **Footnote Filtering**: Link extraction and footnote generation (always applied)

### 3. Domain-Based Pattern Storage

- Patterns keyed by domain (substack.com, convertkit.com, etc.)
- JSON-structured patterns stored in Redis
- Versioned patterns with promotion workflow
- Pattern reference tracking in newsletter records

### 4. Pattern Lifecycle Management

- New patterns start as "test" versions
- Manual promotion to "current" for domain
- Safe pattern pruning based on usage tracking
- Complete audit trail of pattern applications

## Rationale

### Problem with Monolithic Approach

Team concerns during design phase included:

- **Riley React**: *"Different newsletter platforms use different HTML structures - what works for Substack might break Morning Brew"*
- **Dylan Developer**: *"Every filtering choice creates a maintenance burden. The more intelligent we try to be, the more edge cases we create"*
- **Uma UX**: *"We're making decisions FOR users about what they should see"*

### Benefits of Modular Approach

- **Scalability**: New domains don't break existing patterns
- **Maintainability**: Domain-specific logic contained and reusable
- **User Experience**: No configuration required - system learns automatically
- **Data-Driven**: Patterns based on actual newsletters, not assumptions
- **Self-Improving**: Gets better with each newsletter processed

### Integration with Existing System

- Pattern detection occurs BEFORE HTML-to-text conversion (learned from footnote implementation)
- Reprocessing includes pattern recognition for testing and iteration
- Maintains compatibility with existing footnote system

## Implementation Strategy

### Phase 1: Foundation

- Domain detection and pattern storage infrastructure
- Base filter categories as modular components
- Smart defaults for unknown newsletters
- Pattern learning mechanism

### Phase 2: Pattern Building

- Process existing newsletter library to build initial patterns
- Implement pattern versioning and promotion workflow
- Add pattern reference tracking to newsletter schema

### Phase 3: Management Tools

- Pattern export/import for JSON editing
- Usage tracking and safe pruning
- Pattern migration tools for bulk updates

### Phase 4: Advanced Features (Future)

- User override capabilities for power users
- Pattern sharing and community contributions
- Advanced analytics on pattern effectiveness

## Technical Decisions

**Runtime execution addendum (2025-07-13):** Pattern logic is stored as JSON in Redis. A single TypeScript `PatternRunner` loads that JSON at runtime to apply the shared filter functions. Execution remains in code while behaviour is fully data-driven; domain strategies are data, not separate compiled modules.

### Storage Architecture

**Decision**: Redis-based pattern storage with JSON export/import

**Rationale**:

- Fast runtime pattern lookup for processing
- JSON editing capability for pattern refinement
- Consistent with existing newsletter storage
- Avoids deployment complexity of file-based patterns

**Alternative Considered**: File-based patterns with Git integration
**Rejected Because**: Cathy Cloud identified Vercel serverless limitations and deployment complexity

### Pattern Versioning Strategy

**Decision**: Automatic versioning with manual promotion workflow
**Rationale**:

- Safe experimentation without affecting existing content
- Complete pattern history serves as backup system
- Deterministic reprocessing with known pattern versions

**Key Insight from Dylan Developer**: *"If we always version, then versioning IS our backup system"*

### Pattern Application Scope

**Decision**: New patterns only affect new newsletters until manually applied
**Rationale**:

- Eliminates risk of "ruining existing newsletters" 
- No surprise changes to previously processed content
- User maintains control over when to apply pattern updates

**Alternative Considered**: Automatic reprocessing with pattern updates
**Rejected Because**: Mo identified: *"Automatic reprocessing is an issue - ruining existing newsletters, processing overhead, forgetting to test"*

### Pattern Reference Tracking

**Decision**: Add `appliedPattern` field to newsletter schema

**Rationale**:

- Enables safe pattern pruning through usage tracking
- Provides complete audit trail of processing decisions
- Enables deterministic reprocessing and rollback
- Prevents accidental deletion of in-use patterns

**Key Insight from Mo**: *"We'd need a way to 'prune' interim versions that remain 'unused'... we'd know that removing a pattern would be a 'breaking change'"*

## Consequences

### Positive

- **Self-Improving System**: Gets better automatically with each newsletter
- **No User Configuration**: Works transparently without setup
- **Maintainable**: Domain-specific patterns contained and reusable
- **Safe Experimentation**: Version control prevents breaking changes
- **Complete Traceability**: Know exactly how each newsletter was processed

### Negative

- **Increased Complexity**: More moving parts than simple filtering
- **Storage Overhead**: Pattern storage and versioning requirements
- **Learning Period**: System starts "dumb" and improves over time

### Risks

- **Pattern Pollution**: Bad patterns could be learned from broken newsletters
  - *Mitigation*: JSON editing and pattern deletion capabilities (Mo's requirement)
- **Version Proliferation**: Many versions could accumulate over time
  - *Mitigation*: Usage tracking and safe pruning tools (Mo's insight)
- **Performance Impact**: Pattern recognition adds processing overhead
  - *Mitigation*: Domain-based caching and reasonable timeout limits (Cathy Cloud's recommendation)

## Monitoring and Success Criteria

### Technical Metrics

- Pattern coverage: % of newsletters with domain-specific patterns
- Processing reliability: Consistent filtering without errors
- Pattern accuracy: Effectiveness across newsletters from same domain

### User Experience Metrics

- Content quality: Clean, readable newsletters without manual intervention
- Processing consistency: Similar newsletters filtered similarly
- System transparency: Users understand filtering decisions

### Operational Metrics

- Pattern catalog growth over time
- Version pruning efficiency
- Reprocessing usage patterns

## Notes

This architecture emerged from extensive team discussion about the fundamental trade-offs in newsletter filtering. The key insight was Mo's recognition that different newsletter platforms require different approaches, and building a system that can learn and adapt rather than trying to solve all cases with universal rules.

The pattern reference tracking was added as a crucial safety mechanism after Mo recognized the need for safe pattern lifecycle management in a production system.
